from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from schemas import SongCreate


class SongValidator:
    """Validator class for Song-related operations."""
    
    @staticmethod
    def validate_song_create(song_data: SongCreate) -> None:
        """Validate song creation data."""
        if not song_data.title or not song_data.title.strip():
            raise HTTPException(status_code=400, detail="Song title is required")
        
        if not song_data.artist or not song_data.artist.strip():
            raise HTTPException(status_code=400, detail="Artist is required")
        
        # Validate title length
        if len(song_data.title.strip()) > 200:
            raise HTTPException(status_code=400, detail="Song title must be 200 characters or less")
        
        # Validate artist length
        if len(song_data.artist.strip()) > 200:
            raise HTTPException(status_code=400, detail="Artist name must be 200 characters or less")
        
        # Validate album length if provided
        if song_data.album and len(song_data.album.strip()) > 200:
            raise HTTPException(status_code=400, detail="Album name must be 200 characters or less")
        
        # Validate year if provided
        if song_data.year is not None:
            if song_data.year < 1900 or song_data.year > 2100:
                raise HTTPException(status_code=400, detail="Year must be between 1900 and 2100")
    
    @staticmethod
    def validate_song_update(updates: Dict[str, Any]) -> None:
        """Validate song update data."""
        # Validate title if being updated
        if "title" in updates:
            title = updates["title"]
            if not title or not str(title).strip():
                raise HTTPException(status_code=400, detail="Song title is required")
            if len(str(title).strip()) > 200:
                raise HTTPException(status_code=400, detail="Song title must be 200 characters or less")
        
        # Validate artist if being updated
        if "artist" in updates:
            artist = updates["artist"]
            if not artist or not str(artist).strip():
                raise HTTPException(status_code=400, detail="Artist is required")
            if len(str(artist).strip()) > 200:
                raise HTTPException(status_code=400, detail="Artist name must be 200 characters or less")
        
        # Validate album if being updated
        if "album" in updates:
            album = updates["album"]
            if album and len(str(album).strip()) > 200:
                raise HTTPException(status_code=400, detail="Album name must be 200 characters or less")
        
        # Validate year if being updated
        if "year" in updates:
            year = updates["year"]
            if year is not None:
                try:
                    year_int = int(year)
                    if year_int < 1900 or year_int > 2100:
                        raise HTTPException(status_code=400, detail="Year must be between 1900 and 2100")
                except (ValueError, TypeError):
                    raise HTTPException(status_code=400, detail="Year must be a valid integer")
    
    @staticmethod
    def validate_batch_create(songs_data: List[SongCreate], current_user=None, db=None) -> None:
        """Validate batch song creation data including duplicate checks."""
        if not songs_data:
            raise HTTPException(status_code=400, detail="No songs provided")
        
        if len(songs_data) > 100:
            raise HTTPException(status_code=400, detail="Cannot create more than 100 songs in a single batch")
        
        validation_errors = []
        for i, song in enumerate(songs_data):
            try:
                SongValidator.validate_song_create(song)
                
                # Check for duplicates if db and user are provided
                if db and current_user:
                    from api.data_access import check_song_duplicate_for_user
                    if check_song_duplicate_for_user(db, song.title, song.artist, current_user):
                        validation_errors.append(f"Song #{i+1} '{song.title}' by {song.artist} already exists in your database")
                        
            except HTTPException as e:
                validation_errors.append(f"Song #{i+1}: {e.detail}")
        
        # If ANY song fails validation, fail the entire batch
        if validation_errors:
            raise HTTPException(
                status_code=400,
                detail=f"Batch validation failed - {'; '.join(validation_errors)}"
            )
    
    @staticmethod
    def validate_pack_name(pack_name: str) -> None:
        """Validate pack name."""
        if not pack_name or not pack_name.strip():
            raise HTTPException(status_code=400, detail="Pack name is required")
        
        if len(pack_name.strip()) > 100:
            raise HTTPException(status_code=400, detail="Pack name must be 100 characters or less")
        
        if "Optional Songs" in pack_name:
            raise HTTPException(status_code=400, detail="Pack name cannot contain 'Optional Songs'")
    
    @staticmethod
    def validate_song_ids(song_ids: List[int]) -> None:
        """Validate a list of song IDs."""
        if not song_ids:
            raise HTTPException(status_code=400, detail="No song IDs provided")
        
        if len(song_ids) > 1000:
            raise HTTPException(status_code=400, detail="Cannot process more than 1000 songs at once")
        
        # Check for valid integers
        for song_id in song_ids:
            if not isinstance(song_id, int) or song_id <= 0:
                raise HTTPException(status_code=400, detail="All song IDs must be positive integers")
    
    @staticmethod
    def validate_collaboration_data(collaborations_data: List[Dict[str, str]]) -> None:
        """Validate collaboration data."""
        if len(collaborations_data) > 50:
            raise HTTPException(status_code=400, detail="Cannot add more than 50 collaborators")
        
        for i, collab_data in enumerate(collaborations_data):
            if not isinstance(collab_data, dict):
                raise HTTPException(status_code=400, detail=f"Collaboration #{i+1}: Invalid data format")
            
            author = collab_data.get("author", "").strip()
            if not author:
                raise HTTPException(status_code=400, detail=f"Collaboration #{i+1}: Author username is required")
            
            if len(author) > 50:
                raise HTTPException(status_code=400, detail=f"Collaboration #{i+1}: Username must be 50 characters or less")
    
    @staticmethod
    def validate_search_query(query: str) -> None:
        """Validate search query parameters."""
        if query and len(query) > 200:
            raise HTTPException(status_code=400, detail="Search query must be 200 characters or less")
    
    @staticmethod
    def validate_autocomplete_query(query: str) -> None:
        """Validate autocomplete query parameters."""
        # Allow empty queries for autocomplete - return early without error
        if not query or not query.strip():
            return
        
        if len(query.strip()) > 100:
            raise HTTPException(status_code=400, detail="Query must be 100 characters or less")