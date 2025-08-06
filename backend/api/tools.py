import re
from fastapi import Body, APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Song, Collaboration, CollaborationType, Pack
from schemas import SongOut
from api.auth import get_current_active_user
from api.spotify import auto_enhance_song
import json
import asyncio

router = APIRouter(prefix="/tools", tags=["Tools"])

CLEANUP_PATTERNS = [
    r"[-–]?\s*\(?Remaster(ed)?(\s*\d{4})?\)?",
    r"[-–]?\s*\(?\d{4}\s*Remaster\)?",
    r"[-–]?\s*\(?Special Edition\)?",
    r"[-–]?\s*\(?Deluxe Edition\)?",
    r"\[?\d{4}\s*Remaster\]?",
]

def clean_string(title: str) -> str:
    # 1. Remove edition/version-related tags in parentheses
    title = re.sub(
        r"\s*\((Deluxe( (Edition|Version))?|Super Deluxe Edition|Expanded( (Edition|Version))?|Extended Edition|10( Year)? Anniversary Edition|40( Year)? Anniversary Edition|The Ultimate Collection|Re-?Master(ed)?(\s*\d{4})?|Remastered\s+\d{4}|Special Edition|[12][0-9]{3}( Version| Remaster(ed)?| Mix)?)\)",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # 2. Remove broken/incomplete parentheses
    title = re.sub(r"\s*\([^)]*$", "", title)

    # 3. Remove no-paren trailing edition/version suffixes
    title = re.sub(
        r"\s+(Re-?Master(ed)?|Remaster(ed)?|[1-9]{1,2}(st|nd|rd|th) Anniversary|10( Year)? Anniversary( Edition)?|Expanded( Edition| Version)?|Deluxe( Edition| Version)?)$",
        "", title, flags=re.IGNORECASE
    )

    # 4. Remove things like "- 2010"
    title = re.sub(r"\s*-\s*\d{4}$", "", title)

    # 5. NEW: Remove "- 2010 Version", "- 2011 Remaster" etc.
    title = re.sub(
        r"\s*-\s*[12][0-9]{3}( Version| Remaster(ed)?| Mix)?$",
        "", title, flags=re.IGNORECASE
    )

    # 6. NEW: Remove [2015 Remaster] patterns
    title = re.sub(
        r"\s*\[[12][0-9]{3}\s*Remaster(ed)?\]",
        "", title, flags=re.IGNORECASE
    )

    return title.strip()


def bulk_clean_remaster_tags_function(song_ids: list[int], db: Session, current_user_id: int):
    """Standalone function for bulk cleaning remaster tags"""
    updated = []

    for song_id in song_ids:
        # Check if the song belongs to the current user
        song = db.query(Song).filter(Song.id == song_id, Song.user_id == current_user_id).first()
        if not song:
            continue

        cleaned_title = clean_string(song.title)
        cleaned_album = clean_string(song.album or "")

        if cleaned_title != song.title or cleaned_album != song.album:
            song.title = cleaned_title
            song.album = cleaned_album
            db.add(song)
            updated.append(song)

    db.commit()
    print(f"Updated {len(updated)} songs with clean remaster tags")
    return updated


@router.post("/bulk-clean", response_model=list[SongOut])
def bulk_clean_remaster_tags(song_ids: list[int] = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    updated = []

    for song_id in song_ids:
        # Check if the song belongs to the current user
        song = db.query(Song).filter(Song.id == song_id, Song.user_id == current_user.id).first()
        if not song:
            continue

        cleaned_title = clean_string(song.title)
        cleaned_album = clean_string(song.album or "")

        if cleaned_title != song.title or cleaned_album != song.album:
            song.title = cleaned_title
            song.album = cleaned_album
            db.add(song)
            updated.append(song)

    db.commit()
    print("Updated", len(updated), "songs")
    return updated

@router.post("/fix-broken-titles", response_model=list[SongOut])
def fix_mangled_titles(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Only fix songs belonging to the current user
    affected = db.query(Song).filter(
        Song.title.op("LIKE")("% - 20%"),
        Song.user_id == current_user.id
    ).all()
    updated = []

    for song in affected:
        original = song.title
        cleaned = clean_string(original)

        if cleaned != original:
            song.title = cleaned
            updated.append(song)

    db.commit()
    return updated

@router.post("/bulk-enhance")
def bulk_enhance_songs(song_ids: list[int] = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Bulk enhance songs with Spotify data using auto-enhancement"""
    enhanced_songs = []
    failed = []
    progress_updates = []

    for i, song_id in enumerate(song_ids):
        # Check if the song belongs to the current user
        song = db.query(Song).filter(Song.id == song_id, Song.user_id == current_user.id).first()
        if not song:
            failed.append(song_id)
            progress_updates.append({
                "current": i + 1,
                "total": len(song_ids),
                "message": f"Failed to enhance song {song_id} (not found)",
                "song_id": song_id,
                "status": "failed"
            })
            continue

        try:
            # Update progress before processing
            progress_updates.append({
                "current": i + 1,
                "total": len(song_ids),
                "message": f"Enhancing song: {song.title}",
                "song_id": song_id,
                "status": "processing"
            })
            
            # Use the auto_enhance_song function
            if auto_enhance_song(song_id, db):
                # Re-fetch the enhanced song with all relationships
                from sqlalchemy.orm import joinedload
                enhanced_song = db.query(Song).options(
                    joinedload(Song.collaborations).joinedload(Collaboration.user),
                    joinedload(Song.user),
                    joinedload(Song.pack_obj).joinedload(Pack.user),
                    joinedload(Song.authoring)
                ).filter(Song.id == song_id).first()
                
                if enhanced_song:
                    # Convert to SongOut format
                    song_dict = enhanced_song.__dict__.copy()
                    if enhanced_song.user:
                        song_dict["author"] = enhanced_song.user.username
                    
                    # Attach collaborations
                    song_dict["collaborations"] = []
                    if hasattr(enhanced_song, "collaborations"):
                        collaborations_with_username = []
                        for collab in enhanced_song.collaborations:
                            collab_dict = {
                                "id": collab.id,
                                "user_id": collab.user_id,
                                "username": collab.user.username,
                                "collaboration_type": collab.collaboration_type.value,
                                "created_at": collab.created_at
                            }
                            collaborations_with_username.append(collab_dict)
                        song_dict["collaborations"] = collaborations_with_username
                    
                    # Attach pack data
                    if enhanced_song.pack_obj:
                        song_dict["pack_name"] = enhanced_song.pack_obj.name
                        song_dict["pack_owner_id"] = enhanced_song.pack_obj.user_id
                        song_dict["pack_owner_username"] = enhanced_song.pack_obj.user.username if enhanced_song.pack_obj.user else None
                    
                    # Determine if song is editable
                    is_owner = enhanced_song.user_id == current_user.id
                    has_song_collaboration = db.query(Collaboration).filter(
                        Collaboration.song_id == enhanced_song.id,
                        Collaboration.user_id == current_user.id,
                        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
                    ).first() is not None
                    song_dict["is_editable"] = is_owner or has_song_collaboration
                    
                    enhanced_songs.append(SongOut(**song_dict))
                    
                    # Update progress after successful enhancement
                    progress_updates.append({
                        "current": i + 1,
                        "total": len(song_ids),
                        "message": f"Successfully enhanced: {song.title}",
                        "song_id": song_id,
                        "status": "success"
                    })
            else:
                failed.append(song_id)
                progress_updates.append({
                    "current": i + 1,
                    "total": len(song_ids),
                    "message": f"Failed to enhance: {song.title}",
                    "song_id": song_id,
                    "status": "failed"
                })
        except Exception as e:
            print(f"Failed to enhance song {song_id}: {e}")
            failed.append(song_id)
            progress_updates.append({
                "current": i + 1,
                "total": len(song_ids),
                "message": f"Error enhancing song {song_id}: {str(e)}",
                "song_id": song_id,
                "status": "error"
            })

    print(f"Enhanced {len(enhanced_songs)} songs, failed {len(failed)} songs")
    return {
        "enhanced_songs": enhanced_songs,
        "failed_songs": failed,
        "progress_updates": progress_updates,
        "total_enhanced": len(enhanced_songs),
        "total_failed": len(failed)
    }

@router.post("/bulk-enhance-stream")
async def bulk_enhance_songs_stream(song_ids: list[int] = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Bulk enhance songs with real-time progress streaming"""
    
    async def generate_progress():
        enhanced_songs = []
        failed = []
        
        for i, song_id in enumerate(song_ids):
            # Check if the song belongs to the current user
            song = db.query(Song).filter(Song.id == song_id, Song.user_id == current_user.id).first()
            
            if not song:
                failed.append(song_id)
                progress_data = {
                    "type": "progress",
                    "current": i + 1,
                    "total": len(song_ids),
                    "message": f"Failed to enhance song {song_id} (not found)",
                    "song_id": song_id,
                    "status": "failed"
                }
                yield f"data: {json.dumps(progress_data)}\n\n"
                continue

            try:
                # Send progress update before processing
                progress_data = {
                    "type": "progress",
                    "current": i + 1,
                    "total": len(song_ids),
                    "message": f"Enhancing song: {song.title}",
                    "song_id": song_id,
                    "status": "processing"
                }
                yield f"data: {json.dumps(progress_data)}\n\n"
                
                # Use the auto_enhance_song function
                if auto_enhance_song(song_id, db):
                    # Re-fetch the enhanced song with all relationships
                    from sqlalchemy.orm import joinedload
                    enhanced_song = db.query(Song).options(
                        joinedload(Song.collaborations).joinedload(Collaboration.user),
                        joinedload(Song.user),
                        joinedload(Song.pack_obj).joinedload(Pack.user),
                        joinedload(Song.authoring)
                    ).filter(Song.id == song_id).first()
                    
                    if enhanced_song:
                        # Build song dict manually to avoid SQLAlchemy internal objects
                        song_dict = {
                            "id": enhanced_song.id,
                            "title": enhanced_song.title,
                            "artist": enhanced_song.artist,
                            "album": enhanced_song.album,
                            "year": enhanced_song.year,
                            "album_cover": enhanced_song.album_cover,
                            "status": enhanced_song.status,
                            "user_id": enhanced_song.user_id,
                            "pack_id": enhanced_song.pack_id,
                            "created_at": enhanced_song.created_at.isoformat() if enhanced_song.created_at else None,
                        }
                        
                        if enhanced_song.user:
                            song_dict["author"] = enhanced_song.user.username
                        
                        # Attach collaborations
                        song_dict["collaborations"] = []
                        if hasattr(enhanced_song, "collaborations"):
                            collaborations_with_username = []
                            for collab in enhanced_song.collaborations:
                                collab_dict = {
                                    "id": collab.id,
                                    "user_id": collab.user_id,
                                    "username": collab.user.username,
                                    "collaboration_type": collab.collaboration_type.value,
                                    "created_at": collab.created_at.isoformat() if collab.created_at else None
                                }
                                collaborations_with_username.append(collab_dict)
                            song_dict["collaborations"] = collaborations_with_username
                        
                        # Attach pack data
                        if enhanced_song.pack_obj:
                            song_dict["pack_name"] = enhanced_song.pack_obj.name
                            song_dict["pack_owner_id"] = enhanced_song.pack_obj.user_id
                            song_dict["pack_owner_username"] = enhanced_song.pack_obj.user.username if enhanced_song.pack_obj.user else None
                        
                        # Determine if song is editable
                        is_owner = enhanced_song.user_id == current_user.id
                        has_song_collaboration = db.query(Collaboration).filter(
                            Collaboration.song_id == enhanced_song.id,
                            Collaboration.user_id == current_user.id,
                            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
                        ).first() is not None
                        song_dict["is_editable"] = is_owner or has_song_collaboration
                        
                        enhanced_songs.append(song_dict)
                        
                        # Don't send success message - just continue to next song
                        # This makes the progress less jumpy
                else:
                    failed.append(song_id)
                    progress_data = {
                        "type": "progress",
                        "current": i + 1,
                        "total": len(song_ids),
                        "message": f"Failed to enhance: {song.title}",
                        "song_id": song_id,
                        "status": "failed"
                    }
                    yield f"data: {json.dumps(progress_data)}\n\n"
                    
            except Exception as e:
                print(f"Failed to enhance song {song_id}: {e}")
                failed.append(song_id)
                progress_data = {
                    "type": "progress",
                    "current": i + 1,
                    "total": len(song_ids),
                    "message": f"Error enhancing song {song_id}: {str(e)}",
                    "song_id": song_id,
                    "status": "error"
                }
                yield f"data: {json.dumps(progress_data)}\n\n"
            
            # Small delay to make progress visible
            await asyncio.sleep(0.1)
        
        # Send final result
        final_data = {
            "type": "complete",
            "enhanced_songs": enhanced_songs,
            "failed_songs": failed,
            "total_enhanced": len(enhanced_songs),
            "total_failed": len(failed)
        }
        yield f"data: {json.dumps(final_data)}\n\n"
    
    return StreamingResponse(
        generate_progress(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )