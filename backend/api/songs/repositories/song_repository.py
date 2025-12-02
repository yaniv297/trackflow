from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, text
from typing import List, Optional, Set, Dict, Any, Tuple
from models import Song, SongStatus, User, Pack, Collaboration, CollaborationType, Artist, AlbumSeries
from schemas import SongCreate


class SongRepository:
    """Repository class for Song database operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_song_by_id(self, song_id: int) -> Optional[Song]:
        """Get a song by ID with all relationships loaded."""
        return self.db.query(Song).options(
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.user),
            joinedload(Song.pack_obj).joinedload(Pack.user),
            joinedload(Song.authoring)
        ).filter(Song.id == song_id).first()
    
    def get_filtered_songs(
        self,
        user_id: int,
        status: Optional[SongStatus] = None,
        query: Optional[str] = None,
        pack_id: Optional[int] = None,
        completion_threshold: Optional[int] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Song]:
        """Get filtered songs for a user with complex access control."""
        # Pre-fetch collaboration data
        user_song_collab_ids = self._get_user_song_collaboration_ids(user_id)
        user_pack_collab_ids, user_pack_edit_ids = self._get_user_pack_collaboration_ids(user_id)
        user_owned_pack_ids = self._get_user_owned_pack_ids(user_id)
        songs_in_collab_pack_ids = self._get_songs_in_collaborative_pack_ids(user_id)
        
        # Build base query
        q = self.db.query(Song).options(
            joinedload(Song.artist_obj),
            joinedload(Song.user),
            joinedload(Song.pack_obj).joinedload(Pack.user),
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.authoring)
        )
        
        # Apply access control filter
        q = q.filter(
            or_(
                Song.user_id == user_id,
                Song.id.in_(user_song_collab_ids),
                Song.pack_id.in_(user_pack_collab_ids),
                Song.pack_id.in_(songs_in_collab_pack_ids),
                Song.pack_id.in_(user_owned_pack_ids)
            )
        )
        
        # Apply status filter
        if status:
            q = q.filter(Song.status == status)
        
        # Apply pack filter
        if pack_id:
            q = q.filter(Song.pack_id == pack_id)
        
        # Apply text search
        if query:
            pattern = f"%{query}%"
            q = q.filter(
                or_(
                    Song.title.ilike(pattern),
                    Song.artist.ilike(pattern),
                    Song.album.ilike(pattern),
                    Song.id.in_(
                        self.db.query(Collaboration.song_id)
                        .join(User, Collaboration.user_id == User.id)
                        .filter(User.username.ilike(pattern))
                    )
                )
            )
        
        # Apply completion threshold filter
        # Note: completion_percentage is calculated on the fly, not stored in DB
        # This filter is not supported - completion must be calculated client-side
        # if completion_threshold is not None:
        #     q = q.filter(Song.completion_percentage >= completion_threshold)
        
        # Apply ordering
        if order == "title":
            q = q.order_by(Song.title)
        elif order == "artist":
            q = q.order_by(Song.artist)
        elif order == "created_at":
            q = q.order_by(Song.created_at.desc())
        else:
            q = q.order_by(Song.title)  # Default order
        
        # Apply limit
        if limit:
            q = q.limit(limit)
        
        return q.all()
    
    def get_songs_by_pack_id(self, pack_id: int) -> List[Song]:
        """Get all songs in a specific pack."""
        return self.db.query(Song).filter(Song.pack_id == pack_id).all()
    
    def get_user_owned_songs(self, user_id: int, song_ids: List[int]) -> List[Song]:
        """Get songs owned by a specific user from a list of IDs."""
        return self.db.query(Song).filter(
            Song.id.in_(song_ids),
            Song.user_id == user_id
        ).all()
    
    def get_songs_with_relations(self, song_ids: List[int]) -> List[Song]:
        """Get songs by IDs with all relationships loaded."""
        return self.db.query(Song).options(
            joinedload(Song.user),
            joinedload(Song.pack_obj)
        ).filter(Song.id.in_(song_ids)).all()
    
    def check_song_access(self, song_id: int, user_id: int) -> bool:
        """Check if a user has access to modify a song."""
        song = self.get_song_by_id(song_id)
        if not song:
            return False
            
        # User owns the song
        if song.user_id == user_id:
            return True
            
        # User is a direct collaborator
        if self.db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first():
            return True
            
        # User has pack edit access
        if song.pack_id and self.db.query(Collaboration).filter(
            Collaboration.pack_id == song.pack_id,
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first():
            return True
            
        return False
    
    def get_pack_most_common_status(self, pack_id: int) -> Optional[SongStatus]:
        """Get the most common status in a pack."""
        status_counts = self.db.query(Song.status, func.count(Song.id)).filter(
            Song.pack_id == pack_id
        ).group_by(Song.status).order_by(func.count(Song.id).desc()).all()
        
        if status_counts:
            return status_counts[0][0]
        return None
    
    def get_pack_by_name_and_user(self, pack_name: str, user_id: int) -> Optional[Pack]:
        """Get a pack by name and user ID."""
        return self.db.query(Pack).filter(
            Pack.name.ilike(pack_name),
            Pack.user_id == user_id
        ).first()
    
    def get_pack_by_name(self, pack_name: str) -> Optional[Pack]:
        """Get a pack by name."""
        return self.db.query(Pack).filter(Pack.name == pack_name).first()
    
    def has_pack_edit_permission(self, pack_id: int, user_id: int) -> bool:
        """Check if user has pack edit permission."""
        return bool(self.db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first())
    
    def get_album_series_by_id(self, series_id: int) -> Optional[AlbumSeries]:
        """Get album series by ID."""
        return self.db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    
    def get_album_series_by_ids(self, series_ids: List[int]) -> List[AlbumSeries]:
        """Get multiple album series by IDs."""
        return self.db.query(AlbumSeries).filter(AlbumSeries.id.in_(series_ids)).all()
    
    def get_max_series_number(self) -> Optional[int]:
        """Get the maximum series number."""
        result = self.db.query(AlbumSeries.series_number).filter(
            AlbumSeries.series_number.isnot(None)
        ).order_by(AlbumSeries.series_number.desc()).first()
        return result[0] if result else None
    
    def get_user_artists_exact_match(self, user_id: int, query: str) -> List[str]:
        """Get user's artists with exact match."""
        return [r[0] for r in self.db.query(Song.artist).filter(
            Song.user_id == user_id,
            Song.artist.ilike(query)
        ).distinct().all()]
    
    def get_user_artists_partial_match(self, user_id: int, query: str) -> List[str]:
        """Get user's artists with partial match."""
        return [r[0] for r in self.db.query(Song.artist).filter(
            Song.user_id == user_id,
            Song.artist.ilike(f"%{query}%"),
            ~Song.artist.ilike(query)  # Exclude exact matches
        ).distinct().limit(15).all()]
    
    def get_user_albums_exact_match(self, user_id: int, query: str) -> List[str]:
        """Get user's albums with exact match."""
        return [r[0] for r in self.db.query(Song.album).filter(
            Song.user_id == user_id,
            Song.album.ilike(query)
        ).distinct().all()]
    
    def get_user_albums_partial_match(self, user_id: int, query: str) -> List[str]:
        """Get user's albums with partial match."""
        return [r[0] for r in self.db.query(Song.album).filter(
            Song.user_id == user_id,
            Song.album.ilike(f"%{query}%"),
            ~Song.album.ilike(query)  # Exclude exact matches
        ).distinct().limit(15).all()]
    
    def get_user_packs_exact_match(self, user_id: int, query: str) -> List[str]:
        """Get user's packs with exact match."""
        return [r[0] for r in self.db.query(Pack.name).filter(
            Pack.user_id == user_id,
            Pack.name.ilike(query)
        ).distinct().all()]
    
    def get_user_packs_partial_match(self, user_id: int, query: str) -> List[str]:
        """Get user's packs with partial match."""
        return [r[0] for r in self.db.query(Pack.name).filter(
            Pack.user_id == user_id,
            Pack.name.ilike(f"%{query}%"),
            ~Pack.name.ilike(query)  # Exclude exact matches
        ).distinct().limit(15).all()]
    
    def get_all_artists(self) -> List[str]:
        """Get all unique artist names from Artist table and songs."""
        # Get artists from Artist table
        artist_names = [r[0] for r in self.db.query(Artist.name).filter(
            Artist.name.isnot(None),
            Artist.name != ""
        ).distinct().all()]
        
        # Get artists from songs
        song_artists = [r[0] for r in self.db.query(Song.artist).filter(
            Song.artist.isnot(None),
            Song.artist != ""
        ).distinct().all()]
        
        # Combine and remove duplicates
        all_artists = list(set(artist_names + song_artists))
        return sorted(all_artists)
    
    def get_collaborators_autocomplete(self, user_id: int, query: str) -> List[str]:
        """Get collaborator usernames for autocomplete."""
        collaborators = [r[0] for r in self.db.query(User.username).join(
            Collaboration, User.id == Collaboration.user_id
        ).filter(
            or_(
                # Collaborators on songs owned by current user
                Collaboration.song_id.in_(
                    self.db.query(Song.id).filter(Song.user_id == user_id).subquery()
                ),
                # Collaborators on packs owned by current user
                Collaboration.pack_id.in_(
                    self.db.query(Pack.id).filter(Pack.user_id == user_id).subquery()
                ),
                # Collaborators where current user is also a collaborator
                Collaboration.song_id.in_(
                    self.db.query(Collaboration.song_id).filter(
                        Collaboration.user_id == user_id
                    ).subquery()
                )
            ),
            User.username.ilike(f"%{query}%")
        ).distinct().limit(20).all()]
        
        return sorted(collaborators)
    
    def get_all_songs(self) -> List[Song]:
        """Get all songs in the database."""
        return self.db.query(Song).all()
    
    def get_user_collaborations(self, user_id: int) -> List[Collaboration]:
        """Get all collaborations for a user."""
        return self.db.query(Collaboration).filter(
            Collaboration.user_id == user_id
        ).all()
    
    def get_visible_songs_for_debug(self, user_id: int) -> List[Song]:
        """Get all songs visible to a user for debugging."""
        return self.db.query(Song).filter(
            or_(
                Song.user_id == user_id,
                Song.id.in_(
                    self.db.query(Collaboration.song_id)
                    .filter(
                        Collaboration.user_id == user_id,
                        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
                    )
                ),
                Song.pack_id.in_(
                    self.db.query(Collaboration.pack_id)
                    .filter(
                        Collaboration.user_id == user_id,
                        Collaboration.collaboration_type.in_([
                            CollaborationType.PACK_VIEW,
                            CollaborationType.PACK_EDIT
                        ])
                    )
                )
            )
        ).all()
    
    # Helper methods for collaboration data
    def _get_user_song_collaboration_ids(self, user_id: int) -> Set[int]:
        """Get song IDs where user has song-level collaboration."""
        user_song_collaborations = self.db.query(Collaboration.song_id).filter(
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).all()
        return {c.song_id for c in user_song_collaborations}
    
    def _get_user_pack_collaboration_ids(self, user_id: int) -> Tuple[Set[int], Set[int]]:
        """Get pack IDs where user has pack-level collaboration."""
        user_pack_collaborations = self.db.query(Collaboration.pack_id, Collaboration.collaboration_type).filter(
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
        ).all()
        
        user_pack_collab_ids = {c.pack_id for c in user_pack_collaborations if c.pack_id}
        user_pack_edit_ids = {c.pack_id for c in user_pack_collaborations if c.pack_id and c.collaboration_type == CollaborationType.PACK_EDIT}
        
        return user_pack_collab_ids, user_pack_edit_ids
    
    def _get_user_owned_pack_ids(self, user_id: int) -> Set[int]:
        """Get pack IDs owned by user."""
        user_owned_packs = self.db.query(Pack.id).filter(Pack.user_id == user_id).all()
        return {p.id for p in user_owned_packs}
    
    def _get_songs_in_collaborative_pack_ids(self, user_id: int) -> Set[int]:
        """Get pack IDs where user has song-level collaboration."""
        songs_in_collab_packs = self.db.query(Song.pack_id).join(
            Collaboration, Song.id == Collaboration.song_id
        ).filter(
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
            Song.pack_id.isnot(None)
        ).distinct().all()
        return {s.pack_id for s in songs_in_collab_packs if s.pack_id}