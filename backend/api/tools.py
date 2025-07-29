import re
from fastapi import Body, APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Song
from schemas import SongOut

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



@router.post("/bulk-clean", response_model=list[SongOut])
def bulk_clean_remaster_tags(song_ids: list[int] = Body(...), db: Session = Depends(get_db)):
    updated = []

    for song_id in song_ids:
        song = db.query(Song).get(song_id)
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
def fix_mangled_titles(db: Session = Depends(get_db)):
    affected = db.query(Song).filter(Song.title.op("LIKE")("% - 20%")).all()
    updated = []

    for song in affected:
        original = song.title
        cleaned = clean_string(original)

        if cleaned != original:
            song.title = cleaned
            updated.append(song)

    db.commit()
    return updated