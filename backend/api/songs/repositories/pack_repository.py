from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict
from models import Pack, User, Song, Collaboration, CollaborationType


class PackRepository:
    """Repository class for Pack database operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_pack_by_id(self, pack_id: int) -> Optional[Pack]:
        """Get a pack by ID."""
        return self.db.query(Pack).filter(Pack.id == pack_id).first()
    
    def get_pack_by_name_and_user(self, pack_name: str, user_id: int) -> Optional[Pack]:
        """Get a pack by name and user ID."""
        return self.db.query(Pack).filter(
            Pack.name == pack_name,
            Pack.user_id == user_id
        ).first()
    
    def get_pack_by_name(self, pack_name: str) -> Optional[Pack]:
        """Get a pack by name (any owner)."""
        return self.db.query(Pack).filter(Pack.name == pack_name).first()
    
    def get_packs_by_ids(self, pack_ids: List[int]) -> Dict[int, Pack]:
        """Get multiple packs by IDs and return as a dictionary."""
        packs = self.db.query(Pack).join(User).filter(Pack.id.in_(pack_ids)).all()
        return {p.id: p for p in packs}
    
    def create_pack(
        self,
        name: str,
        user_id: int,
        priority: Optional[int] = None,
        status: str = "in_progress"
    ) -> Pack:
        """Create a new pack."""
        pack = Pack(
            name=name,
            user_id=user_id,
            priority=priority,
            status=status
        )
        self.db.add(pack)
        self.db.commit()
        self.db.refresh(pack)
        return pack
    
    def update_pack_status(self, pack_id: int, status: str):
        """Update pack status."""
        pack = self.get_pack_by_id(pack_id)
        if pack:
            pack.status = status
            self.db.commit()
    
    def get_pack_owner(self, pack_id: int) -> Optional[User]:
        """Get the owner of a pack."""
        return self.db.query(User).filter(User.id == Pack.user_id, Pack.id == pack_id).first()
    
    def has_pack_edit_permission(self, pack_id: int, user_id: int) -> bool:
        """Check if user has pack edit permission."""
        return bool(self.db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first())