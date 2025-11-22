from sqlalchemy.orm import Session
from typing import List, Optional
from models import Collaboration, CollaborationType, User


class CollaborationRepository:
    """Repository class for Collaboration database operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def delete_song_collaborations(self, song_id: int, collaboration_type: CollaborationType = CollaborationType.SONG_EDIT):
        """Delete all collaborations of a specific type for a song."""
        self.db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.collaboration_type == collaboration_type
        ).delete()
        self.db.commit()
    
    def create_collaboration(
        self,
        user_id: int,
        collaboration_type: CollaborationType,
        song_id: Optional[int] = None,
        pack_id: Optional[int] = None
    ) -> Collaboration:
        """Create a new collaboration."""
        collaboration = Collaboration(
            user_id=user_id,
            collaboration_type=collaboration_type,
            song_id=song_id,
            pack_id=pack_id
        )
        self.db.add(collaboration)
        self.db.commit()
        self.db.refresh(collaboration)
        return collaboration
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get a user by username."""
        return self.db.query(User).filter(User.username == username).first()
    
    def collaboration_exists(
        self,
        user_id: int,
        collaboration_type: CollaborationType,
        song_id: Optional[int] = None,
        pack_id: Optional[int] = None
    ) -> bool:
        """Check if a collaboration already exists."""
        query = self.db.query(Collaboration).filter(
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == collaboration_type
        )
        
        if song_id:
            query = query.filter(Collaboration.song_id == song_id)
        if pack_id:
            query = query.filter(Collaboration.pack_id == pack_id)
            
        return query.first() is not None