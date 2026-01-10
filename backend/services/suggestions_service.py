from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Union
import random

from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Song, WipCollaboration
from services.completion_service import build_song_completion_data
from api.packs import compute_packs_near_completion
from api.authoring import get_recent_authoring_activity


def normalize_datetime(dt: Union[str, datetime, None]) -> Optional[datetime]:
    """Convert datetime string or object to naive datetime object.
    
    SQLite returns datetime columns as strings, PostgreSQL returns datetime objects.
    This function handles both cases.
    """
    if dt is None:
        return None
    if isinstance(dt, str):
        # Parse common datetime string formats
        try:
            # Try ISO format first
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            try:
                # Try common SQLite format
                dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S.%f')
            except ValueError:
                try:
                    dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    return None
    # If it's already a datetime, ensure it's naive (no timezone)
    if isinstance(dt, datetime):
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        return dt
    return None


class SuggestionsService:
    """Generates dashboard suggestions (songs + packs)."""

    def __init__(self, db: Session, current_user):
        self.db = db
        self.current_user = current_user

    def get_suggestions(self, limit: int = 6) -> List[Dict[str, Any]]:
        # Fetch more songs to ensure we have enough variety for randomization
        # We need at least 2x limit (12) for true randomization, so fetch more initially
        songs, song_map = self._fetch_songs(limit=50)

        completion_data = build_song_completion_data(self.db, songs)
        song_enriched = {song.id: self._enrich_song(song, completion_data) for song in songs}

        suggestions: List[Dict[str, Any]] = []
        used_ids = set()

        # 1. Last worked on
        last_song = self._get_last_worked_song(songs, song_enriched)
        if last_song:
            suggestions.append(last_song)
            used_ids.add(last_song["id"])

        # 2. Almost done songs
        almost_done_suggestions = self._get_almost_done_songs(
            songs, song_enriched, used_ids
        )
        suggestions.extend(almost_done_suggestions)
        used_ids.update(s["id"] for s in almost_done_suggestions)

        # 3. Recently worked on songs
        # Pass completion_data and song_enriched to avoid redundant queries
        recent_suggestions = self._get_recently_worked_songs(
            song_map, used_ids, completion_data, song_enriched
        )
        suggestions.extend(recent_suggestions)
        used_ids.update(s["id"] for s in recent_suggestions)

        # 4. Collaborator waiting songs
        self._apply_collaborator_waiting(suggestions, song_enriched, song_map, used_ids)

        # 5. Long time no work songs
        long_time_suggestions = self._get_long_time_no_work_songs(
            songs, song_enriched, used_ids
        )
        suggestions.extend(long_time_suggestions)
        used_ids.update(s["id"] for s in long_time_suggestions)

        # 6. Packs near completion (optional - skip if we already have enough suggestions)
        # Pack completion can be slow, so only fetch if we need more suggestions
        if len(suggestions) < limit:
            try:
                pack_suggestions = self._get_pack_suggestions(used_ids)
                suggestions.extend(pack_suggestions)
            except Exception as e:
                # If pack suggestions fail or are slow, continue without them
                print(f"⚠️ Pack suggestions failed: {e}")
                pass

        # Fill with fallback songs if we have fewer than requested
        remaining = max(0, limit - len(suggestions))
        if remaining > 0:
            filler = self._get_fallback_songs(
                song_enriched, used_ids, remaining, min_completion=70
            )
            suggestions.extend(filler)
            used_ids.update(item["id"] for item in filler)

        # Ensure we have enough variety for randomization (target 2x limit, min 10)
        # This is critical: we need MORE candidates than the limit to get true randomization
        target_pool_size = max(limit * 2, 10)
        if len(suggestions) < target_pool_size:
            extra_needed = target_pool_size - len(suggestions)
            # Start with 70% completion threshold, but lower it if we don't have enough
            extra = self._get_fallback_songs(
                song_enriched, used_ids, extra_needed, min_completion=70
            )
            # If we still don't have enough, lower the threshold to get more variety
            if len(extra) < extra_needed:
                still_needed = extra_needed - len(extra)
                extra_lower = self._get_fallback_songs(
                    song_enriched, used_ids, still_needed, min_completion=50
                )
                extra.extend(extra_lower)
                used_ids.update(item["id"] for item in extra_lower)
            # If still not enough, lower even more
            if len(extra) < extra_needed:
                still_needed = extra_needed - len(extra)
                extra_lower = self._get_fallback_songs(
                    song_enriched, used_ids, still_needed, min_completion=0
                )
                extra.extend(extra_lower)
                used_ids.update(item["id"] for item in extra_lower)
            suggestions.extend(extra)
            used_ids.update(item["id"] for item in extra)

        # Sort by priority to keep higher-signal items first
        suggestions.sort(key=lambda item: item["priority"], reverse=True)

        # Deduplicate by ID to ensure no duplicate songs
        seen_ids = set()
        deduplicated = []
        for item in suggestions:
            item_id = item.get("id")
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                deduplicated.append(item)

        # Collect a candidate pool (up to 20) and shuffle to rotate entries
        pool_size = max(limit * 2, 10)
        candidate_pool = deduplicated[:pool_size]
        
        random.shuffle(candidate_pool)

        sample_size = min(limit, len(candidate_pool))
        if sample_size == 0:
            return candidate_pool

        result = random.sample(candidate_pool, sample_size)
        return result

    # --- internal helpers ---

    def _fetch_songs(self, limit: int = 30) -> Tuple[List[Song], Dict[int, Song]]:
        from sqlalchemy import or_
        songs = (
            self.db.query(Song)
            .filter(
                Song.status == "In Progress", 
                Song.user_id == self.current_user.id,
                or_(Song.optional.is_(False), Song.optional.is_(None))  # Exclude optional songs
            )
            .order_by(desc(Song.updated_at))
            .limit(limit)
            .all()
        )
        song_map = {song.id: song for song in songs}
        return songs, song_map

    def _enrich_song(
        self, song: Song, completion_data: Dict[int, Dict[str, Any]]
    ) -> Dict[str, Any]:
        data = completion_data.get(song.id, {})
        completion = data.get("completion")
        remaining_steps = data.get("remaining_steps", [])

        return {
            "id": f"song-{song.id}",
            "type": "song",
            "song_id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album_cover": song.album_cover,
            "completion": completion,
            "remaining_steps": remaining_steps,
            "updated_at": (dt.isoformat() if (dt := normalize_datetime(song.updated_at)) else None),
             "status": song.status,
            "tags": [],
            "priority": 0,
        }

    def _get_last_worked_song(self, songs, song_enriched) -> Optional[Dict[str, Any]]:
        if not songs:
            return None

        sorted_songs = sorted(
            songs,
            key=lambda s: normalize_datetime(s.updated_at or s.created_at) or datetime.min,
            reverse=True,
        )

        # Prefer songs at 70%+ completion
        primary = self._select_last_song(sorted_songs, song_enriched, min_completion=70)
        if primary:
            return primary

        # Fallback to any in-progress song if nothing is that far along
        return self._select_last_song(sorted_songs, song_enriched, min_completion=0)

    def _select_last_song(
        self, sorted_songs, song_enriched, min_completion: int
    ) -> Optional[Dict[str, Any]]:
        for song in sorted_songs:
            enriched = song_enriched.get(song.id)
            if not enriched or enriched["completion"] >= 100:
                continue
            completion = enriched.get("completion") or 0
            if completion < min_completion:
                continue
            cloned = {**enriched}
            cloned["tags"] = ["Continue working"]
            cloned["priority"] = 10 if completion >= 70 else 7
            cloned["message"] = self._message_for_song(cloned, include_recent=False)
            return cloned
        return None

    def _get_almost_done_songs(self, songs, song_enriched, used_ids):
        items = []
        for song in songs:
            enriched = song_enriched.get(song.id)
            if not enriched:
                continue
            # Skip if already used
            if enriched["id"] in used_ids:
                continue
            completion = enriched.get("completion")
            if completion is None or completion >= 100 or completion < 80:
                continue
            enriched = {**enriched}
            enriched["tags"] = enriched.get("tags", []) + ["Almost done"]
            enriched["priority"] = 8 + (completion / 100) * 2
            enriched["message"] = self._message_for_song(enriched)
            items.append(enriched)
        return items

    def _get_recently_worked_songs(
        self, song_map, used_ids, completion_data, song_enriched
    ):
        recent_parts = get_recent_authoring_activity(
            limit=20, db=self.db, current_user=self.current_user
        )
        grouped = {}
        for part in recent_parts:
            sid = part["song_id"]
            grouped.setdefault(sid, {"parts": [], **part})
            grouped[sid]["parts"].append(part["part_name"])

        # Find songs that aren't in our initial fetch
        missing_song_ids = [
            sid for sid in grouped.keys()
            if sid not in song_map and f"song-{sid}" not in used_ids
        ]
        
        # Fetch missing songs and compute their completion data in one batch
        if missing_song_ids:
            from sqlalchemy import or_
            missing_songs = (
                self.db.query(Song)
                .filter(Song.id.in_(missing_song_ids))
                .filter(Song.status == "In Progress")
                .filter(or_(Song.optional.is_(False), Song.optional.is_(None)))  # Exclude optional songs
                .all()
            )
            if missing_songs:
                # Build completion data for all missing songs at once
                missing_completion_data = build_song_completion_data(self.db, missing_songs)
                # Merge into existing completion_data
                completion_data.update(missing_completion_data)
                # Add to song_map and song_enriched
                for song in missing_songs:
                    song_map[song.id] = song
                    song_enriched[song.id] = self._enrich_song(song, completion_data)

        suggestions = []
        for sid, info in grouped.items():
            if f"song-{sid}" in used_ids:
                continue
            base_song = song_map.get(sid)
            if not base_song:
                continue
            # Use already-computed completion data instead of calling build_song_completion_data again
            enriched = song_enriched.get(sid)
            if not enriched:
                # Fallback: compute if somehow missing (shouldn't happen)
                completion_info = build_song_completion_data(self.db, [base_song])
                enriched = self._enrich_song(base_song, completion_info)
                song_enriched[sid] = enriched
            if enriched["completion"] is None or enriched["completion"] >= 100:
                continue
            enriched = {**enriched}  # Clone to avoid mutating shared dict
            enriched["tags"] = enriched.get("tags", []) + ["Recently worked on"]
            enriched["priority"] = 6
            enriched["message"] = self._message_for_song(enriched, recent_parts=info["parts"])
            enriched["album_cover"] = (
                info.get("album_cover") or enriched.get("album_cover")
            )
            suggestions.append(enriched)
        return suggestions

    def _get_long_time_no_work_songs(self, songs, song_enriched, used_ids):
        """Find songs that have some progress but haven't been updated in a while."""
        candidates = []
        for song in songs:
            enriched = song_enriched.get(song.id)
            if not enriched:
                continue
            if f"song-{song.id}" in used_ids:
                continue
            completion = enriched.get("completion") or 0
            # Must have started work (> 0%) but not finished (< 100%)
            if completion <= 0 or completion >= 100:
                continue
            candidates.append((song, enriched))

        if not candidates:
            return []

        # Query song_progress to get actual last work date for all candidate songs
        from sqlalchemy import text
        song_ids = [song.id for song, _ in candidates]
        placeholders = ",".join([f":song_id_{i}" for i in range(len(song_ids))])
        params = {f"song_id_{i}": sid for i, sid in enumerate(song_ids)}
        
        progress_results = self.db.execute(
            text(f"""
                SELECT song_id, MAX(updated_at) as max_updated_at
                FROM song_progress
                WHERE song_id IN ({placeholders})
                GROUP BY song_id
            """),
            params
        ).fetchall()
        
        # Build a map of song_id -> max updated_at from song_progress
        progress_map = {row[0]: row[1] for row in progress_results if row[1] is not None}

        # Sort by actual last work date (from song_progress) ascending (oldest first)
        # Fall back to song.updated_at or song.created_at if no progress exists
        def get_sort_key(item):
            song, _ = item
            # Prefer song_progress.updated_at, then song.updated_at, then song.created_at
            if song.id in progress_map:
                dt = normalize_datetime(progress_map[song.id])
                return dt if dt else datetime.min
            dt = normalize_datetime(song.updated_at or song.created_at)
            return dt if dt else datetime.min
        
        candidates.sort(key=get_sort_key)

        # Filter to only include songs that haven't been worked on for at least 30 days
        # This ensures "long time no work" actually means long time
        MIN_DAYS_THRESHOLD = 30
        now = datetime.utcnow()
        long_time_candidates = []
        
        for song, enriched in candidates:
            # Get actual last work date
            last_updated = progress_map.get(song.id) or song.updated_at or song.created_at
            last_updated = normalize_datetime(last_updated)
            if not last_updated:
                # If no date at all, skip (shouldn't happen for songs with progress)
                continue
            
            days_ago = (now - last_updated).days
            
            # Only include if it's been at least MIN_DAYS_THRESHOLD days
            if days_ago >= MIN_DAYS_THRESHOLD:
                long_time_candidates.append((song, enriched, days_ago))

        suggestions = []
        for song, enriched, days_ago in long_time_candidates[:3]:  # Limit to top 3 oldest
            cloned = {**enriched}
            cloned["tags"] = cloned.get("tags", []) + ["Long time no work"]
            cloned["priority"] = 4
            
            # Calculate days since last work - use song_progress.updated_at if available
            # This correctly reflects actual work done, including by collaborators
            last_updated = progress_map.get(song.id) or song.updated_at or song.created_at
            
            if days_ago == 0:
                cloned["message"] = "It was today since you last worked on this song"
            elif days_ago == 1:
                cloned["message"] = "It was 1 day since you last worked on this song"
            else:
                cloned["message"] = f"It was {days_ago} days since you last worked on this song"
            
            suggestions.append(cloned)
        
        return suggestions

    def _get_fallback_songs(self, song_enriched, used_ids, needed, min_completion=0):
        if needed <= 0:
            return []

        unused = [
            data
            for data in song_enriched.values()
            if data["id"] not in used_ids
            and (data.get("completion") or 0) < 100
            and (data.get("completion") or 0) >= min_completion
            and data.get("status") == "In Progress"
        ]

        def sort_key(item):
            completion = item.get("completion") or 0
            updated_at = item.get("updated_at") or ""
            return (-completion, updated_at)

        unused.sort(key=sort_key)

        filler = []
        for data in unused[:needed]:
            item = {**data}
            item["tags"] = item.get("tags", []) + ["In progress"]
            item["priority"] = item.get("priority", 1)
            if not item.get("message"):
                item["message"] = self._message_for_song(item, include_recent=False)
            filler.append(item)
        return filler

    def _get_pack_suggestions(self, used_ids):
        # Reduce limit from 10 to 3 since we only need a few pack suggestions
        # This reduces the number of packs we need to process
        packs_data = compute_packs_near_completion(
            self.db, self.current_user, limit=3, threshold=70
        )
        suggestions = []
        for pack in packs_data:
            # Backward-compat mapping: compute_packs_near_completion now returns
            # pack_id, pack_name, completion_percentage, incomplete_songs, total_songs.
            completion = pack.get("completion_percentage")
            if completion is None or completion < 70:
                continue

            total_songs = pack.get("total_songs") or 0
            # Some callers used completed_songs; derive it when only incomplete_songs is present.
            completed_songs = pack.get("completed_songs")
            if completed_songs is None:
                incomplete = pack.get("incomplete_songs") or 0
                completed_songs = max(total_songs - incomplete, 0)

            remaining = max(total_songs - completed_songs, 0)

            pack_id = pack.get("id") or pack.get("pack_id")
            # Prioritize display_name (which includes album series format) over pack name
            title = pack.get("display_name")
            if not title:
                title = pack.get("name") or pack.get("pack_name")

            suggestions.append(
                {
                    "id": f"pack-{pack_id}",
                    "type": "pack",
                    "pack_id": pack_id,
                    "title": title,
                    "album_cover": pack.get("album_cover"),
                    "tags": ["Pack almost done"],
                    "priority": 5 + (completion / 100) * 2,
                    "completion": completion,
                    "total_songs": total_songs,
                    "completed_songs": completed_songs,
                    "message": self._message_for_pack(remaining),
                }
            )
        return suggestions

    def _apply_collaborator_waiting(
        self, suggestions, song_enriched, song_map, used_ids
    ):
        username = getattr(self.current_user, "username", None)
        if not username:
            return

        from sqlalchemy import or_
        rows = (
            self.db.query(WipCollaboration.song_id, WipCollaboration.field)
            .join(Song, Song.id == WipCollaboration.song_id)
            .filter(
                Song.status == "In Progress",
                WipCollaboration.collaborator == username,
                or_(Song.optional.is_(False), Song.optional.is_(None))  # Exclude optional songs
            )
            .all()
        )

        if not rows:
            return

        assignments: Dict[int, List[str]] = {}
        for song_id, field in rows:
            assignments.setdefault(song_id, []).append(field)

        missing_ids = [sid for sid in assignments if sid not in song_enriched]
        if missing_ids:
            missing_songs = (
                self.db.query(Song).filter(Song.id.in_(missing_ids)).all()
            )
            if missing_songs:
                extra_completion = build_song_completion_data(self.db, missing_songs)
                for song in missing_songs:
                    song_map[song.id] = song
                    song_enriched[song.id] = self._enrich_song(
                        song, extra_completion
                    )

        suggestion_map = {item["id"]: item for item in suggestions}

        for song_id, fields in assignments.items():
            enriched = song_enriched.get(song_id)
            if not enriched:
                continue

            outstanding = self._filter_outstanding_fields(
                fields, enriched.get("remaining_steps") or []
            )
            if not outstanding:
                continue

            suggestion_id = enriched["id"]
            if suggestion_id in suggestion_map:
                target = suggestion_map[suggestion_id]
            else:
                target = {**enriched}
                suggestions.append(target)
                used_ids.add(suggestion_id)
                suggestion_map[suggestion_id] = target

            tags = target.setdefault("tags", [])
            if "Collaborator waiting" not in tags:
                tags.append("Collaborator waiting")
            target["priority"] = max(target.get("priority", 0), 9)

            formatted = self._format_step_list(outstanding)
            if formatted:
                target["message"] = f"{formatted} still assigned to you"

    def _message_for_song(self, suggestion, include_recent: bool = True, recent_parts=None):
        remaining = suggestion.get("remaining_steps") or []
        completion = suggestion.get("completion")
        recent_parts = recent_parts or []

        remaining_count = len(remaining)
        detailed_remaining = 0 < remaining_count <= 3

        formatted_recent = self._format_step_list(recent_parts)
        formatted_remaining = (
            self._format_step_list(remaining) if detailed_remaining else None
        )

        if (
            include_recent
            and formatted_recent
            and formatted_remaining
        ):
            return f"You recently completed {formatted_recent}, only {formatted_remaining} next!"
        if formatted_recent:
            return f"You recently completed {formatted_recent}! Keep going on this song."
        if formatted_remaining:
            return f"Only {formatted_remaining} to finish this song!"
        if remaining_count > 3:
            return "Continue working on this song."
        if completion is not None:
            return f"{completion}% complete"
        return None

    def _format_step_list(self, steps: List[str]) -> Optional[str]:
        if not steps:
            return None
        formatted = []
        for step in steps:
            text = (step or "").replace("_", " ").title()
            formatted.append(text)
        display = formatted[:2]
        extra = len(formatted) - len(display)
        if not display:
            return None
        if extra == 0:
            if len(display) == 1:
                return display[0]
            return " and ".join(display)
        if len(display) == 1:
            return f"{display[0]} and {extra} more"
        return f"{', '.join(display)} and {extra} more"

    def _message_for_pack(self, remaining_songs: int) -> Optional[str]:
        if remaining_songs == 1:
            return "1 song left to finish this pack!"
        if remaining_songs > 1:
            return f"{remaining_songs} songs left to finish this pack"
        return None

    def _filter_outstanding_fields(
        self, assigned_fields: List[str], remaining_steps: List[str]
    ) -> List[str]:
        if not assigned_fields or not remaining_steps:
            return []

        remaining_lookup = {
            self._normalize_field_name(step): step
            for step in remaining_steps
            if step
        }
        outstanding = []
        for field in assigned_fields:
            normalized = self._normalize_field_name(field)
            if normalized in remaining_lookup:
                outstanding.append(remaining_lookup[normalized])
        return outstanding

    def _normalize_field_name(self, value: Optional[str]) -> str:
        if not value:
            return ""
        return value.replace("_", "").replace(" ", "").lower()

