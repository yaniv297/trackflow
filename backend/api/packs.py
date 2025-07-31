from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Pack, User
from auth import get_current_active_user
from pydantic import BaseModel

router = APIRouter()

class PackCreate(BaseModel):
    name: str

class PackResponse(BaseModel):
    id: int
    name: str
    user_id: int
    created_at: str
    updated_at: str

@router.post("/", response_model=PackResponse)
def create_pack(pack: PackCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Create a new pack"""
    # Check if pack with this name already exists for this user
    existing_pack = db.query(Pack).filter(
        Pack.name == pack.name,
        Pack.user_id == current_user.id
    ).first()
    
    if existing_pack:
        raise HTTPException(status_code=400, detail="Pack with this name already exists")
    
    new_pack = Pack(
        name=pack.name,
        user_id=current_user.id
    )
    
    db.add(new_pack)
    db.commit()
    db.refresh(new_pack)
    
    return PackResponse(
        id=new_pack.id,
        name=new_pack.name,
        user_id=new_pack.user_id,
        created_at=new_pack.created_at.isoformat(),
        updated_at=new_pack.updated_at.isoformat()
    )

@router.get("/", response_model=List[PackResponse])
def get_packs(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all packs for the current user"""
    packs = db.query(Pack).filter(Pack.user_id == current_user.id).all()
    return [
        PackResponse(
            id=pack.id,
            name=pack.name,
            user_id=pack.user_id,
            created_at=pack.created_at.isoformat(),
            updated_at=pack.updated_at.isoformat()
        )
        for pack in packs
    ]

@router.get("/{pack_id}", response_model=PackResponse)
def get_pack(pack_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get a specific pack by ID"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user has access to this pack
    if pack.user_id != current_user.id:
        # Check if user is a collaborator on this pack
        from models import Collaboration, CollaborationType
        collaboration = db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
        ).first()
        
        if not collaboration:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return PackResponse(
        id=pack.id,
        name=pack.name,
        user_id=pack.user_id,
        created_at=pack.created_at.isoformat(),
        updated_at=pack.updated_at.isoformat()
    ) 