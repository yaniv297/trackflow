from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, text
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
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Song]:
        """Get filtered songs for a user with complex access control."""
        # Bulk pre-fetch all collaboration data in a single optimized call
        collaboration_data = self._bulk_get_user_collaboration_data(user_id)
        
        # Build base query
        q = self.db.query(Song).options(
            joinedload(Song.artist_obj),
            joinedload(Song.user),
            joinedload(Song.pack_obj).joinedload(Pack.user),
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.authoring)
        )
        
        # Apply access control filter using bulk-fetched data
        q = q.filter(
            or_(
                Song.user_id == user_id,
                Song.id.in_(collaboration_data['user_song_collab_ids']),
                Song.pack_id.in_(collaboration_data['user_pack_collab_ids']),
                Song.pack_id.in_(collaboration_data['song_collab_pack_ids']),
                Song.pack_id.in_(collaboration_data['user_owned_pack_ids'])
            )
        )
        
        # Apply status filter with dual-presence support
        # Songs with update_status should appear in Future Plans/WIP even if status is "Released"
        if status:
            if status == SongStatus.future:
                # Future Plans: include songs with status="Future Plans" OR (status="Released" AND update_status="future_plans")
                q = q.filter(
                    or_(
                        Song.status == status,
                        and_(Song.status == SongStatus.released, Song.update_status == "future_plans")
                    )
                )
            elif status == SongStatus.wip:
                # In Progress: include songs with status="In Progress" OR (status="Released" AND update_status="in_progress")
                q = q.filter(
                    or_(
                        Song.status == status,
                        and_(Song.status == SongStatus.released, Song.update_status == "in_progress")
                    )
                )
            else:
                # For Released status, include all released songs (including those with update_status)
                # They appear in both views
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
                    ),
                    Song.pack_id.in_(
                        self.db.query(Pack.id)
                        .filter(Pack.name.ilike(pattern))
                    )
                )
            )
        
        # Apply completion threshold filter
        # Note: completion_percentage is calculated on the fly, not stored in DB
        # This filter is not supported - completion must be calculated client-side
        # if completion_threshold is not None:
        #     q = q.filter(Song.completion_percentage >= completion_threshold)
        
        # Apply ordering (optimized with indexed columns)
        if order == "title":
            q = q.order_by(Song.title, Song.id)  # Add ID for consistent ordering
        elif order == "artist":
            q = q.order_by(Song.artist, Song.title, Song.id)
        elif order == "created_at":
            q = q.order_by(Song.created_at.desc(), Song.id)
        elif order == "updated_at":
            q = q.order_by(Song.updated_at.desc(), Song.id)
        else:
            # For WIP/Released pages, default to updated_at DESC for better UX
            q = q.order_by(Song.updated_at.desc(), Song.id)
        
        # Apply pagination (limit + offset)
        if limit:
            q = q.limit(limit)
        if offset:
            q = q.offset(offset)
        
        # Use safe query execution to handle potential datetime issues
        try:
            return q.all()
        except ValueError as e:
            if "Invalid isoformat string" in str(e):
                # Clean up bad datetime data and retry
                from database_protection import clean_datetime_strings
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("Detected bad datetime data in songs, attempting cleanup")
                fixes_applied = clean_datetime_strings(self.db)
                if fixes_applied > 0:
                    logger.info(f"Applied {fixes_applied} datetime fixes, retrying query")
                    return q.all()
                else:
                    logger.error("No datetime fixes applied, query still failing")
            raise
    
    def count_filtered_songs(
        self,
        user_id: int,
        status: Optional[SongStatus] = None,
        query: Optional[str] = None,
        pack_id: Optional[int] = None
    ) -> int:
        """Get count of filtered songs for pagination."""
        # Use the same filtering logic as get_filtered_songs but only count
        collaboration_data = self._bulk_get_user_collaboration_data(user_id)
        
        q = self.db.query(Song)
        
        # Apply status filter with dual-presence support
        # Songs with update_status should appear in Future Plans/WIP even if status is "Released"
        if status:
            if status == SongStatus.future:
                # Future Plans: include songs with status="Future Plans" OR (status="Released" AND update_status="future_plans")
                q = q.filter(
                    or_(
                        Song.status == status,
                        and_(Song.status == SongStatus.released, Song.update_status == "future_plans")
                    )
                )
            elif status == SongStatus.wip:
                # In Progress: include songs with status="In Progress" OR (status="Released" AND update_status="in_progress")
                q = q.filter(
                    or_(
                        Song.status == status,
                        and_(Song.status == SongStatus.released, Song.update_status == "in_progress")
                    )
                )
            else:
                # For Released status, include all released songs (including those with update_status)
                q = q.filter(Song.status == status)
        
        # Apply query filter
        if query:
            search_term = f"%{query}%"
            q = q.filter(
                or_(
                    Song.title.ilike(search_term),
                    Song.artist.ilike(search_term),
                    Song.album.ilike(search_term),
                    Song.pack_id.in_(
                        self.db.query(Pack.id)
                        .filter(Pack.name.ilike(search_term))
                    )
                )
            )
        
        # Apply pack filter
        if pack_id:
            q = q.filter(Song.pack_id == pack_id)
        
        # Apply access control filter using bulk-fetched data
        q = q.filter(
            or_(
                Song.user_id == user_id,
                Song.id.in_(collaboration_data['user_song_collab_ids']),
                Song.pack_id.in_(collaboration_data['user_pack_collab_ids']),
                Song.pack_id.in_(collaboration_data['song_collab_pack_ids']),
                Song.pack_id.in_(collaboration_data['user_owned_pack_ids'])
            )
        )
        
        return q.count()
    
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
                # Use JOINs instead of subqueries for better performance
                # These will be optimized by the bulk collaboration fetch anyway
                False  # This condition will be handled by bulk pre-fetched data
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
    def _bulk_get_user_collaboration_data(self, user_id: int) -> Dict[str, Set[int]]:
        """Bulk fetch all collaboration data for a user in optimized queries."""
        
        # Single query to get all collaboration data
        collaborations = self.db.query(
            Collaboration.song_id,
            Collaboration.pack_id, 
            Collaboration.collaboration_type
        ).filter(
            Collaboration.user_id == user_id
        ).all()
        
        # Single query to get user's owned packs
        user_owned_packs = self.db.query(Pack.id).filter(Pack.user_id == user_id).all()
        user_owned_pack_ids = {p.id for p in user_owned_packs}
        
        # Single query to get pack IDs for song collaborations
        song_collab_pack_rows = (
            self.db.query(Song.pack_id)
            .join(Collaboration, Collaboration.song_id == Song.id)
            .filter(
                Collaboration.user_id == user_id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
                Song.pack_id.isnot(None),
            )
            .distinct()
            .all()
        )
        
        # Process the bulk data
        user_song_collab_ids = set()
        user_pack_collab_ids = set()
        user_pack_edit_ids = set()
        
        for collab in collaborations:
            if collab.collaboration_type == CollaborationType.SONG_EDIT and collab.song_id:
                user_song_collab_ids.add(collab.song_id)
            
            if collab.collaboration_type in [CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT] and collab.pack_id:
                user_pack_collab_ids.add(collab.pack_id)
                if collab.collaboration_type == CollaborationType.PACK_EDIT:
                    user_pack_edit_ids.add(collab.pack_id)
        
        song_collab_pack_ids = {row.pack_id for row in song_collab_pack_rows if getattr(row, "pack_id", None) is not None}
        
        return {
            'user_song_collab_ids': user_song_collab_ids,
            'user_pack_collab_ids': user_pack_collab_ids,
            'user_pack_edit_ids': user_pack_edit_ids,
            'user_owned_pack_ids': user_owned_pack_ids,
            'song_collab_pack_ids': song_collab_pack_ids
        }
    
    def _get_user_song_collaboration_ids(self, user_id: int) -> Set[int]:
        """Get song IDs where user has song-level collaboration (legacy method)."""
        data = self._bulk_get_user_collaboration_data(user_id)
        return data['user_song_collab_ids']
    
    def _get_user_pack_collaboration_ids(self, user_id: int) -> Tuple[Set[int], Set[int]]:
        """Get pack IDs where user has pack-level collaboration (legacy method)."""
        data = self._bulk_get_user_collaboration_data(user_id)
        return data['user_pack_collab_ids'], data['user_pack_edit_ids']
    
    def _get_user_owned_pack_ids(self, user_id: int) -> Set[int]:
        """Get pack IDs owned by user (legacy method)."""
        data = self._bulk_get_user_collaboration_data(user_id)
        return data['user_owned_pack_ids']

    def _get_user_song_collaboration_pack_ids(self, user_id: int) -> Set[int]:
        """Get pack IDs for songs where user has SONG_EDIT collaboration (legacy method)."""
        data = self._bulk_get_user_collaboration_data(user_id)
        return data['song_collab_pack_ids']
    
