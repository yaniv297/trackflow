"""User management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User
from ..schemas import UserCreate, UserResponse, Token
from ..services.auth_service import AuthService
from ..dependencies import get_current_active_user
from ..repositories.user_repository import UserRepository

router = APIRouter()


@router.post("/register", response_model=Token)
def register(registration_data: dict, db: Session = Depends(get_db)):
    """Register a new user with custom workflow."""
    auth_service = AuthService(db)
    
    # Extract and validate registration data
    username = registration_data.get("username", "").strip()
    email = registration_data.get("email", "").strip()
    password = registration_data.get("password", "")
    workflow_steps = registration_data.get("workflow_steps", [])
    
    if not username or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, email, and password are required"
        )
    
    # Validate workflow_steps - REQUIRED for registration
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
        # Create user
        user = auth_service.create_user(username, email, password)
        db.flush()  # Get user.id without committing
        
        # Create user workflow (no template dependency)
        db.execute(text("""
            INSERT INTO user_workflows (user_id, name, description, template_id, created_at, updated_at)
            VALUES (:uid, 'My Workflow', 'Custom workflow', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {"uid": user.id})
        
        # Get the workflow_id
        workflow_result = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": user.id}).fetchone()
        if not workflow_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user workflow"
            )
        workflow_id = workflow_result[0]
        
        # Insert workflow steps (using only columns that exist in the table)
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
        
        # Commit transaction - if any step fails, entire registration fails
        db.commit()
        db.refresh(user)
        
        # Log workflow creation
        try:
            from api.activity_logger import log_activity
            log_activity(
                db=db,
                user_id=user.id,
                activity_type="workflow_created",
                description=f"Created user workflow with {len(workflow_steps)} steps during registration",
                metadata={"step_count": len(workflow_steps), "workflow_id": workflow_id}
            )
        except Exception as e:
            print(f"Warning: Failed to log workflow creation for user {user.id}: {e}")
        
        print(f"✅ Created user workflow for user {user.id} with {len(workflow_steps)} steps")
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "register", 
                f"User {user.username} registered new account"
            )
        except Exception as e:
            print(f"Failed to log registration activity: {e}")
        
        # Update login streak (first login for new user)
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
            # Don't fail registration if streak update fails
        
        # Award Welcome Aboard achievement
        try:
            from api.achievements.services.achievements_service import AchievementsService
            achievements_service = AchievementsService()
            result = achievements_service.award_achievement(db, user.id, "welcome_aboard")
            if result:
                print(f"✅ Successfully awarded Welcome Aboard achievement to user {user.id}")
            else:
                print(f"⚠️ Welcome Aboard achievement not awarded (may already exist or achievement not found in DB)")
        except Exception as e:
            print(f"❌ Error awarding Welcome Aboard achievement for user {user.id}: {e}")
            import traceback
            traceback.print_exc()
            # Don't fail registration if achievement award fails
        
        # Create access token
        access_token = auth_service.create_access_token(data={"sub": user.username})
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account and workflow"
        )
    except Exception as e:
        db.rollback()
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        )


@router.get("/users/")
def get_users(
    current_user: UserResponse = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Get all users (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user_repo = UserRepository(db)
    users = user_repo.get_all_users()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in users
    ]


@router.get("/unclaimed-users")
def get_unclaimed_users(db: Session = Depends(get_db)):
    """Get list of unclaimed user accounts."""
    user_repo = UserRepository(db)
    unclaimed_users = user_repo.get_unclaimed_users()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in unclaimed_users
    ]