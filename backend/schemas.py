from pydantic import BaseModel
from models import SongStatus
from typing import Optional, List
from datetime import datetime

class SongCollaborationCreate(BaseModel):
    author: str
    parts: Optional[str] = None

class SongCollaborationOut(BaseModel):
    id: int
    author: str
    parts: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class SongCreate(BaseModel):
    artist: str
    title: str
    album: Optional[str] = None
    pack: Optional[str] = None
    status: SongStatus
    year: Optional[int] = None
    album_cover: Optional[str] = None
    notes: Optional[str] = None
    author: Optional[str] = None
    user_id: Optional[int] = None
    optional: Optional[bool] = None
    collaborations: Optional[List[SongCollaborationCreate]] = None

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
    author: Optional[str]
    user_id: Optional[int]
    collaborations: List[SongCollaborationOut] = []
    authoring: Optional[AuthoringOut] 
    optional: Optional[bool]
    artist_image_url: Optional[str] = None
    album_series_id: Optional[int] = None
    album_series_number: Optional[int] = None
    album_series_name: Optional[str] = None
    

    class Config:
        from_attributes = True

class AuthoringUpdate(BaseModel):
    demucs: Optional[bool] = None
    midi: Optional[bool] = None
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

class AlbumSeriesResponse(BaseModel):
    id: int
    series_number: Optional[int] = None
    album_name: str
    artist_name: str
    year: Optional[int] = None
    cover_image_url: Optional[str] = None
    status: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    song_count: int = 0
    authors: List[str] = []  # List of all authors in this series
    
    class Config:
        from_attributes = True

class AlbumSeriesDetailResponse(BaseModel):
    id: int
    series_number: Optional[int] = None
    album_name: str
    artist_name: str
    year: Optional[int] = None
    cover_image_url: Optional[str] = None
    status: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    album_songs: List[SongOut]
    bonus_songs: List[SongOut]
    total_songs: int
    authors: List[str] = []  # List of all authors in this series
    
    class Config:
        from_attributes = True

class CreateAlbumSeriesRequest(BaseModel):
    pack_name: str
    artist_name: str
    album_name: str
    year: Optional[int] = None
    cover_image_url: Optional[str] = None
    description: Optional[str] = None