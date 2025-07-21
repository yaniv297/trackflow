from pydantic import BaseModel
from models import SongStatus
from typing import Optional

class SongCreate(BaseModel):
    artist: str
    title: str
    album: str | None = None
    pack: str | None = None
    status: SongStatus
    year: int | None = None
    album_cover: str | None = None
    notes: str | None = None
    optional: bool | None = None

class AuthoringOut(BaseModel):
    id: int
    song_id: int
    demucs: bool
    midi: bool
    tempo_map: bool
    fake_ending: bool
    drums: bool
    bass: bool
    guitar: bool
    vocals: bool
    harmonies: bool
    pro_keys: bool
    keys: bool
    animations: bool
    drum_fills: bool
    overdrive: bool
    compile: bool

    class Config:
        from_attributes = True
        
class SongOut(BaseModel):
    id: int
    title: str
    artist: str
    album: Optional[str]
    status: SongStatus
    pack: Optional[str]
    year: Optional[int]
    album_cover: Optional[str]
    authoring: Optional[AuthoringOut] 
    optional: Optional[bool]
    artist_image_url: Optional[str] = None

    class Config:
        from_attributes = True

class AuthoringUpdate(BaseModel):
    demucs: Optional[bool] = None
    tempo_map: Optional[bool] = None
    fake_ending: Optional[bool] = None
    drums: Optional[bool] = None
    bass: Optional[bool] = None
    guitar: Optional[bool] = None
    vocals: Optional[bool] = None
    harmonies: Optional[bool] = None
    pro_keys: Optional[bool] = None
    keys: Optional[bool] = None
    animations: Optional[bool] = None
    drum_fills: Optional[bool] = None
    overdrive: Optional[bool] = None
    compile: Optional[bool] = None

class EnhanceRequest(BaseModel):
    track_id: str