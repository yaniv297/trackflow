from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class SongStatus(str, enum.Enum):
    released = "Released"
    wip = "In Progress"
    future = "Future Plans"

class Artist(Base):
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_url = Column(String, nullable=True)
    songs = relationship("Song", back_populates="artist_obj")

class AlbumSeries(Base):
    __tablename__ = "album_series"
    
    id = Column(Integer, primary_key=True, index=True)
    series_number = Column(Integer, unique=True, nullable=True, index=True)  # Null for planned/in-progress
    album_name = Column(String, nullable=False)
    artist_name = Column(String, nullable=False)
    year = Column(Integer, nullable=True)
    cover_image_url = Column(String, nullable=True)
    status = Column(String, default="planned")  # planned, in_progress, released
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to songs
    songs = relationship("Song", back_populates="album_series_obj")

class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, primary_key=True, index=True)
    artist = Column(String, index=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=True)
    title = Column(String, index=True)
    album = Column(String, nullable=True)
    pack = Column(String, nullable=True)
    status = Column(Enum(SongStatus), default=SongStatus.future)
    year = Column(Integer, nullable=True)
    album_cover = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    author = Column(String, nullable=True, index=True)  # Track who authored the song (for backward compatibility)
    authoring = relationship("AuthoringProgress", uselist=False, back_populates="song")
    optional = Column(Boolean, default=False)
    artist_obj = relationship("Artist", back_populates="songs", foreign_keys=[artist_id])
    album_series_id = Column(Integer, ForeignKey("album_series.id"), nullable=True)
    album_series_obj = relationship("AlbumSeries", back_populates="songs", foreign_keys=[album_series_id])
    
    # New relationship for collaborations
    collaborations = relationship("SongCollaboration", back_populates="song", cascade="all, delete-orphan")
    wip_collaborations = relationship("WipCollaboration", back_populates="song", cascade="all, delete-orphan")

class SongCollaboration(Base):
    __tablename__ = "song_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)
    author = Column(String, nullable=False, index=True)
    parts = Column(String, nullable=True)  # e.g., "drums, bass" or "vocals, harmonies"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    song = relationship("Song", back_populates="collaborations")

class WipCollaboration(Base):
    __tablename__ = "wip_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)
    collaborator = Column(String, nullable=False, index=True)
    field = Column(String, nullable=False)  # e.g., "drums", "bass", "vocals"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    song = relationship("Song", back_populates="wip_collaborations")
    
class AuthoringProgress(Base):
    __tablename__ = "authoring"

    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), unique=True)

    demucs = Column(Boolean, default=False)
    midi = Column(Boolean, default=False)
    tempo_map = Column(Boolean, default=False)
    fake_ending = Column(Boolean, default=False)
    drums = Column(Boolean, default=False)
    bass = Column(Boolean, default=False)
    guitar = Column(Boolean, default=False)
    vocals = Column(Boolean, default=False)
    harmonies = Column(Boolean, default=False)
    pro_keys = Column(Boolean, default=False)
    keys = Column(Boolean, default=False)
    animations = Column(Boolean, default=False)
    drum_fills = Column(Boolean, default=False)
    overdrive = Column(Boolean, default=False)
    compile = Column(Boolean, default=False)

    song = relationship("Song", back_populates="authoring")
