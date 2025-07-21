from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum

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
    authoring = relationship("AuthoringProgress", uselist=False, back_populates="song")
    optional = Column(Boolean, default=False)
    artist_obj = relationship("Artist", back_populates="songs", foreign_keys=[artist_id])
    
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
