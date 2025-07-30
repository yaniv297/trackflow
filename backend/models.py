from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class SongStatus(str, enum.Enum):
    released = "Released"
    wip = "In Progress"
    future = "Future Plans"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    songs = relationship("Song", back_populates="user")
    artists = relationship("Artist", back_populates="user")
    packs = relationship("Pack", back_populates="user", cascade="all, delete-orphan")
    collaborations = relationship("SongCollaboration", back_populates="collaborator", cascade="all, delete-orphan")
    wip_collaborations = relationship("WipCollaboration", back_populates="collaborator", cascade="all, delete-orphan")
    pack_collaborations = relationship("PackCollaboration", foreign_keys="PackCollaboration.collaborator_id", back_populates="collaborator", cascade="all, delete-orphan")
    owned_pack_collaborations = relationship("PackCollaboration", foreign_keys="PackCollaboration.owner_id", back_populates="owner", cascade="all, delete-orphan")
    song_pack_collaborations = relationship("SongPackCollaboration", foreign_keys="SongPackCollaboration.collaborator_id", back_populates="collaborator", cascade="all, delete-orphan")
    owned_song_pack_collaborations = relationship("SongPackCollaboration", foreign_keys="SongPackCollaboration.owner_id", back_populates="owner", cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.hashed_password = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.hashed_password, password)

class Artist(Base):
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    songs = relationship("Song", back_populates="artist_obj")
    user = relationship("User", back_populates="artists")

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
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=True)  # Link to the pack
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to songs
    songs = relationship("Song", back_populates="album_series_obj")
    # Relationship to pack
    pack = relationship("Pack", back_populates="album_series")

class Pack(Base):
    __tablename__ = "packs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="packs")
    songs = relationship("Song", back_populates="pack_obj")
    collaborations = relationship("PackCollaboration", back_populates="pack", cascade="all, delete-orphan")
    song_collaborations = relationship("SongPackCollaboration", back_populates="pack", cascade="all, delete-orphan")
    album_series = relationship("AlbumSeries", back_populates="pack", cascade="all, delete-orphan")

class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, primary_key=True, index=True)
    artist = Column(String, index=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=True)
    title = Column(String, index=True)
    album = Column(String, nullable=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=True)
    status = Column(Enum(SongStatus), default=SongStatus.future)
    year = Column(Integer, nullable=True)
    album_cover = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User ownership
    authoring = relationship("AuthoringProgress", uselist=False, back_populates="song")
    optional = Column(Boolean, default=False)
    artist_obj = relationship("Artist", back_populates="songs", foreign_keys=[artist_id])
    pack_obj = relationship("Pack", back_populates="songs", foreign_keys=[pack_id])
    album_series_id = Column(Integer, ForeignKey("album_series.id"), nullable=True)
    album_series_obj = relationship("AlbumSeries", back_populates="songs", foreign_keys=[album_series_id])
    user = relationship("User", back_populates="songs")  # New relationship
    
    # New relationship for collaborations
    collaborations = relationship("SongCollaboration", back_populates="song", cascade="all, delete-orphan")
    wip_collaborations = relationship("WipCollaboration", back_populates="song", cascade="all, delete-orphan")
    pack_collaborations = relationship("SongPackCollaboration", back_populates="song", cascade="all, delete-orphan")

class SongCollaboration(Base):
    __tablename__ = "song_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    collaborator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=True)  # e.g., "drums", "bass", "vocals", "producer"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    song = relationship("Song", back_populates="collaborations")
    collaborator = relationship("User", back_populates="collaborations")
    
    # Ensure unique collaboration per user per song
    __table_args__ = (UniqueConstraint('song_id', 'collaborator_id', name='unique_song_collaborator'),)

class WipCollaboration(Base):
    __tablename__ = "wip_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    collaborator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    field = Column(String, nullable=False)  # e.g., "drums", "bass", "vocals"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    song = relationship("Song", back_populates="wip_collaborations")
    collaborator = relationship("User", back_populates="wip_collaborations")
    
    # Ensure unique field collaboration per user per song
    __table_args__ = (UniqueConstraint('song_id', 'collaborator_id', 'field', name='unique_wip_collaboration'),)

class PackCollaboration(Base):
    __tablename__ = "pack_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("packs.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    collaborator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pack = relationship("Pack", back_populates="collaborations")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_pack_collaborations")
    collaborator = relationship("User", foreign_keys=[collaborator_id], back_populates="pack_collaborations")
    
    # Ensure unique collaboration per user per pack
    __table_args__ = (UniqueConstraint('pack_id', 'collaborator_id', name='unique_pack_collaborator'),)


class SongPackCollaboration(Base):
    __tablename__ = "song_pack_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("packs.id", ondelete="CASCADE"), nullable=False)
    song_id = Column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    collaborator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    can_edit = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pack = relationship("Pack", back_populates="song_collaborations")
    song = relationship("Song", back_populates="pack_collaborations")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_song_pack_collaborations")
    collaborator = relationship("User", foreign_keys=[collaborator_id], back_populates="song_pack_collaborations")
    
    # Ensure unique collaboration per user per song per pack
    __table_args__ = (UniqueConstraint('pack_id', 'song_id', 'collaborator_id', name='unique_song_pack_collaborator'),)


    
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
