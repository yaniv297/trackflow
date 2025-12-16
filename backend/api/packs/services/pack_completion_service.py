"""Pack completion service for analyzing pack progress."""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, or_

from models import Pack, Song, SongStatus
from ..repositories.pack_repository import PackRepository
from ..schemas import PackCompletionResponse


class PackCompletionService:
    """Service for pack completion analysis."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pack_repo = PackRepository(db)
    
    def get_packs_near_completion(self, user_id: int, limit: int = 3, threshold: int = 70) -> List[PackCompletionResponse]:
        """Get packs that are close to completion."""
        # Optimization: Only query packs that have in-progress songs
        # This avoids loading all packs when most might not have in-progress songs
        packs_with_songs = (
            self.db.query(Pack)
            .join(Song, Song.pack_id == Pack.id)
            .filter(
                Pack.user_id == user_id,
                Song.status == "In Progress",
                or_(Song.optional.is_(False), Song.optional.is_(None)),
            )
            .distinct()
            .limit(limit * 3)  # Check up to 3x the limit to find enough qualifying packs
            .all()
        )
        
        pack_completions = []
        
        for pack in packs_with_songs:
            # Get only "In Progress" songs in the pack (core songs only - filter out optional)
            pack_songs = (
                self.db.query(Song)
                .filter(
                    Song.pack_id == pack.id,
                    Song.status == "In Progress",
                    or_(Song.optional.is_(False), Song.optional.is_(None)),
                )
                .all()
            )
            
            if not pack_songs:
                continue
            
            completion_data = self._calculate_pack_completion_with_workflow(pack, pack_songs)
            completion_percentage = completion_data['completion_percentage']
            
            # Only include packs that meet the threshold and aren't 100% complete
            if threshold <= completion_percentage < 100:
                pack_completions.append((pack, completion_data))
                
                # Early exit if we have enough qualifying packs
                if len(pack_completions) >= limit * 2:
                    break
        
        # Sort by completion percentage descending
        pack_completions.sort(key=lambda x: x[1]['completion_percentage'], reverse=True)
        
        # Take only the top results
        near_completion_packs = []
        for pack, completion_data in pack_completions[:limit]:
            near_completion_packs.append(PackCompletionResponse(
                pack_id=pack.id,
                pack_name=pack.name,
                completion_percentage=completion_data['completion_percentage'],
                incomplete_songs=completion_data['incomplete_songs'],
                total_songs=completion_data['total_songs']
            ))
        
        return near_completion_packs
    
    def _calculate_pack_completion_with_workflow(self, pack: Pack, pack_songs: List[Song]) -> Dict[str, Any]:
        """Calculate completion statistics using workflow progress (matches original logic)."""
        if not pack_songs:
            return {
                'total_songs': 0,
                'completed_songs': 0,
                'incomplete_songs': 0,
                'completion_percentage': 0.0
            }
        
        # Get unique song owner IDs to fetch their workflows
        song_owner_ids = list(set(song.user_id for song in pack_songs if song.user_id))
        
        # Fetch workflow fields for all song owners
        workflow_fields_map: Dict[int, List[str]] = {}
        if song_owner_ids:
            try:
                placeholders = ",".join([f":uid{i}" for i in range(len(song_owner_ids))])
                params = {f"uid{i}": user_id for i, user_id in enumerate(song_owner_ids)}
                
                workflow_rows = self.db.execute(text(f"""
                    SELECT uw.user_id, uws.step_name
                    FROM user_workflows uw
                    JOIN user_workflow_steps uws ON uw.id = uws.workflow_id
                    WHERE uw.user_id IN ({placeholders})
                    ORDER BY uw.user_id, uws.order_index
                """), params).fetchall()
                
                # Group by user_id
                for user_id, step_name in workflow_rows:
                    if user_id not in workflow_fields_map:
                        workflow_fields_map[user_id] = []
                    workflow_fields_map[user_id].append(step_name)
            except Exception:
                # If workflow tables don't exist or query fails, users without workflows
                # will have empty workflow_fields_map, resulting in 0% completion
                # This encourages users to configure their workflows
                pass
        
        # Get song progress for all songs
        song_ids = [song.id for song in pack_songs]
        song_progress_map: Dict[int, Dict[str, bool]] = {}
        
        if song_ids:
            try:
                progress_placeholders = ",".join([f":sid{i}" for i in range(len(song_ids))])
                progress_params = {f"sid{i}": song_id for i, song_id in enumerate(song_ids)}
                
                progress_rows = self.db.execute(text(f"""
                    SELECT song_id, step_name, is_completed
                    FROM song_progress
                    WHERE song_id IN ({progress_placeholders})
                """), progress_params).fetchall()
                
                # Build progress map
                for song_id, step_name, is_completed in progress_rows:
                    if song_id not in song_progress_map:
                        song_progress_map[song_id] = {}
                    song_progress_map[song_id][step_name] = bool(is_completed)
            except Exception:
                pass  # song_progress table might not exist
        
        # Calculate completion
        completed_songs = 0
        total_songs = len(pack_songs)
        
        for song in pack_songs:
            # Check if song is complete by status first
            if song.status == "Released":
                completed_songs += 1
                continue
            
            # Check workflow progress - REQUIRED, no fallback to hardcoded steps
            user_workflow = workflow_fields_map.get(song.user_id)
            song_progress = song_progress_map.get(song.id, {})
            
            # Only calculate completion if user has a configured workflow
            # Users without workflows cannot have songs marked as complete
            if user_workflow:
                completed_steps = sum(1 for step in user_workflow if song_progress.get(step, False))
                total_steps = len(user_workflow)
                
                # Consider complete if all steps are done
                if completed_steps == total_steps:
                    completed_songs += 1
            # If no workflow exists, song remains incomplete (encourages workflow setup)
        
        incomplete_songs = total_songs - completed_songs
        completion_percentage = (completed_songs / total_songs) * 100 if total_songs > 0 else 0
        
        return {
            'total_songs': total_songs,
            'completed_songs': completed_songs,
            'incomplete_songs': incomplete_songs,
            'completion_percentage': completion_percentage
        }