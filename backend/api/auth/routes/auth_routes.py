"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from ..schemas import UserLogin, UserResponse, Token, ClaimUserRequest
from ..services.auth_service import AuthService
from ..dependencies import get_current_active_user as _get_current_active_user_response, get_current_user

router = APIRouter()


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login user and return access token."""
    auth_service = AuthService(db)
    
    try:
        # Check if this is first login (before updating last_login_at)
        user_before_login = auth_service.user_repo.get_by_username(user_credentials.username)
        is_first_login = user_before_login and user_before_login.last_login_at is None
        
        access_token, user = auth_service.login_user(
            user_credentials.username, 
            user_credentials.password
        )
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "login", 
                f"User {user.username} logged in from IP {request.client.host if request.client else 'unknown'}"
            )
        except Exception as e:
            print(f"Failed to log login activity: {e}")
        
        # Record user activity for online tracking
        try:
            from api.user_activity import record_activity
            record_activity(user.id)
        except Exception as e:
            print(f"Failed to record user activity: {e}")
        
        # Update login streak
        try:
            from api.achievements.repositories.achievements_repository import AchievementsRepository
            achievements_repo = AchievementsRepository()
            new_streak = achievements_repo.update_login_streak(db, user.id)
            print(f"✅ Updated login streak for user {user.id} to {new_streak}")
            
            # Check login streak achievements after updating streak
            from api.achievements.services.achievements_service import AchievementsService
            achievements_service = AchievementsService()
            achievements_service.check_login_streak_achievements(db, user.id)
        except Exception as e:
            print(f"Warning: Failed to update login streak for user {user.id}: {e}")
            # Don't fail login if streak update fails
        
        # Award Welcome Aboard achievement on first login if not already earned (fallback)
        if is_first_login:
            try:
                from api.achievements.services.achievements_service import AchievementsService
                achievements_service = AchievementsService()
                achievements_service.award_achievement(db, user.id, "welcome_aboard")
            except Exception as e:
                print(f"Warning: Failed to award Welcome Aboard achievement for user {user.id} on first login: {e}")
                # Don't fail login if achievement award fails
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )


@router.post("/refresh", response_model=Token)
def refresh_token(current_user: UserResponse = Depends(_get_current_active_user_response)):
    """Refresh user access token."""
    auth_service = AuthService(None)  # No DB needed for token creation
    
    access_token = auth_service.create_access_token(data={"sub": current_user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/claim-user", response_model=Token)
def claim_existing_user(
    claim_request: ClaimUserRequest,
    db: Session = Depends(get_db)
):
    """Claim an existing unclaimed user account with custom workflow."""
    auth_service = AuthService(db)
    
    workflow_steps = claim_request.workflow_steps or []
    
    # Validate workflow_steps - REQUIRED for claiming
    if not workflow_steps or len(workflow_steps) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="workflow_steps is required and must have at least 1 step"
        )
    
    # Validate each step
    step_names = set()
    for i, step in enumerate(workflow_steps):
        step_name = step.get("step_name", "").strip()
        display_name = step.get("display_name", "").strip()
        
        if not step_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step {i+1}: step_name is required and cannot be empty"
            )
        
        if not display_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step {i+1}: display_name is required and cannot be empty"
            )
        
        # Ensure step names are unique
        if step_name in step_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step '{step_name}' appears multiple times. Each step must be unique."
            )
        step_names.add(step_name)
    
    from sqlalchemy import text
    from sqlalchemy.exc import SQLAlchemyError
    
    try:
        # Claim the user
        user = auth_service.claim_user(
            claim_request.username,
            claim_request.email,
            claim_request.password
        )
        db.flush()  # Get changes without committing
        
        # Check if workflow already exists
        existing_workflow = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": user.id}).fetchone()
        
        if existing_workflow:
            # Update existing workflow
            workflow_id = existing_workflow[0]
            # Clear existing steps
            db.execute(text("DELETE FROM user_workflow_steps WHERE workflow_id = :wid"), {"wid": workflow_id})
        else:
            # Create new workflow (no template dependency)
            db.execute(text("""
                INSERT INTO user_workflows (user_id, name, description, template_id, created_at, updated_at)
                VALUES (:uid, 'My Workflow', 'Custom workflow', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {"uid": user.id})
            
            workflow_result = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": user.id}).fetchone()
            if not workflow_result:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user workflow"
                )
            workflow_id = workflow_result[0]
        
        # Insert workflow steps
        for i, step in enumerate(workflow_steps):
            db.execute(text("""
                INSERT INTO user_workflow_steps (workflow_id, step_name, display_name, order_index)
                VALUES (:wid, :step_name, :display_name, :order_index)
            """), {
                "wid": workflow_id,
                "step_name": step["step_name"],
                "display_name": step["display_name"],
                "order_index": i
            })
        
        # Commit transaction
        db.commit()
        db.refresh(user)
        
        # Log workflow creation/update
        try:
            from api.activity_logger import log_activity
            log_activity(
                db=db,
                user_id=user.id,
                activity_type="workflow_created" if not existing_workflow else "workflow_updated",
                description=f"{'Created' if not existing_workflow else 'Updated'} user workflow with {len(workflow_steps)} steps during account claim",
                metadata={"step_count": len(workflow_steps), "workflow_id": workflow_id}
            )
        except Exception as e:
            print(f"Warning: Failed to log workflow creation for user {user.id}: {e}")
        
        print(f"✅ {'Created' if not existing_workflow else 'Updated'} user workflow for user {user.id} with {len(workflow_steps)} steps")
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "claim_user", 
                f"User {user.username} claimed their account"
            )
        except Exception as e:
            print(f"Failed to log claim activity: {e}")
        
        # Update login streak (first login for claimed user)
        try:
            from api.achievements.repositories.achievements_repository import AchievementsRepository
            achievements_repo = AchievementsRepository()
            new_streak = achievements_repo.update_login_streak(db, user.id)
            print(f"✅ Updated login streak for user {user.id} to {new_streak}")
            
            # Check login streak achievements after updating streak
            from api.achievements.services.achievements_service import AchievementsService
            achievements_service = AchievementsService()
            achievements_service.check_login_streak_achievements(db, user.id)
        except Exception as e:
            print(f"Warning: Failed to update login streak for user {user.id}: {e}")
            # Don't fail claim if streak update fails
        
        # Award Welcome Aboard achievement if not already earned
        try:
            from api.achievements.services.achievements_service import AchievementsService
            achievements_service = AchievementsService()
            achievements_service.award_achievement(db, user.id, "welcome_aboard")
        except Exception as e:
            print(f"Warning: Failed to award Welcome Aboard achievement for user {user.id}: {e}")
            # Don't fail claim if achievement award fails
        
        # Create access token
        access_token = auth_service.create_access_token(data={"sub": user.username})
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error during user claim: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to claim user account and create workflow"
        )
    except Exception as e:
        db.rollback()
        print(f"Claim user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during account claim"
        )


@router.get("/ping")
def ping():
    """Health check endpoint."""
    return {"message": "Auth service is running"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: UserResponse = Depends(_get_current_active_user_response)):
    """Get current user information."""
    return current_user