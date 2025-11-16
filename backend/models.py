from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

# Re-export Base for compatibility
__all__ = ['Base', 'User', 'Song', 'Pack', 'Collaboration', 'CollaborationType', 'AlbumSeries', 'Authoring', 'Artist', 'SongStatus', 'WipCollaboration', 'FileLink', 'AlbumSeriesPreexisting', 'RockBandDLC']

class SongStatus(str, enum.Enum):
    released = "Released"
    wip = "In Progress"
    future = "Future Plans"

class CollaborationType(enum.Enum):
    PACK_VIEW = "pack_view"
    PACK_EDIT = "pack_edit"
    SONG_EDIT = "song_edit"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)  # NULL = unclaimed user
    
    # User settings fields
    display_name = Column(String, nullable=True)  # Optional display name (different from username)
    preferred_contact_method = Column(String, nullable=True)  # "email" or "discord"
    discord_username = Column(String, nullable=True)  # Discord username for contact
    
    # Relationships
    songs = relationship("Song", back_populates="user")
    packs = relationship("Pack", back_populates="user")
    collaborations = relationship("Collaboration", back_populates="user")
    artists = relationship("Artist", back_populates="user")

class Pack(Base):
    __tablename__ = "packs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Relationships
    user = relationship("User", back_populates="packs")
    songs = relationship("Song", back_populates="pack_obj")
    collaborations = relationship("Collaboration", back_populates="pack")

class Song(Base):
    __tablename__ = "songs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=True)
    album = Column(String, index=True)
    year = Column(Integer)
    status = Column(String, index=True)  # "Future Plans", "In Progress", "Released"
    album_cover = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), index=True)
    optional = Column(Boolean, default=False)  # Whether this song is optional for pack completion
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_song_user_status', 'user_id', 'status'),
        Index('idx_song_pack_status', 'pack_id', 'status'),
        Index('idx_song_artist_title', 'artist', 'title'),
    )
    
    # Relationships
    user = relationship("User", back_populates="songs")
    pack_obj = relationship("Pack", back_populates="songs")
    artist_obj = relationship("Artist", back_populates="songs")
    authoring = relationship(
        "Authoring",
        back_populates="song",
        uselist=False,
        cascade="",  # Do not auto-delete or update authoring (can be a DB view)
        passive_deletes=True,
    )
    collaborations = relationship("Collaboration", back_populates="song")
    # Song-level album series override (nullable)
    album_series_id = Column(Integer, ForeignKey("album_series.id"), nullable=True, index=True)
    album_series_obj = relationship("AlbumSeries", foreign_keys=[album_series_id], uselist=False)

class Collaboration(Base):
    __tablename__ = "collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    collaboration_type = Column(Enum(CollaborationType), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Ensure either pack_id or song_id is set, but not both
    __table_args__ = (
        UniqueConstraint('pack_id', 'song_id', 'user_id', 'collaboration_type', name='unique_collaboration'),
        # Composite indexes for common query patterns
        Index('idx_collab_user_type', 'user_id', 'collaboration_type'),
        Index('idx_collab_song_user', 'song_id', 'user_id'),
        Index('idx_collab_pack_user', 'pack_id', 'user_id'),
    )
    
    # Relationships
    pack = relationship("Pack", back_populates="collaborations")
    song = relationship("Song", back_populates="collaborations")
    user = relationship("User", back_populates="collaborations")

class Artist(Base):
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    songs = relationship("Song", back_populates="artist_obj")
    user = relationship("User", back_populates="artists")

class AlbumSeries(Base):
    __tablename__ = "album_series"
    
    id = Column(Integer, primary_key=True, index=True)
    series_number = Column(Integer, unique=True, index=True)
    album_name = Column(String, nullable=False)
    artist_name = Column(String, nullable=False)
    year = Column(Integer)
    cover_image_url = Column(String)
    status = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    pack_id = Column(Integer, ForeignKey("packs.id"))
    
    # Relationships
    pack = relationship("Pack", foreign_keys=[pack_id])

# Legacy SongCollaboration model removed - use unified Collaboration model instead

class AlbumSeriesPreexisting(Base):
    __tablename__ = "album_series_preexisting"
    
    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("album_series.id"), nullable=False, index=True)
    spotify_track_id = Column(String, nullable=True, index=True)
    title_clean = Column(String, nullable=True, index=True)
    artist = Column(String, nullable=True, index=True)
    pre_existing = Column(Boolean, default=False)  # User marked as "already done"
    irrelevant = Column(Boolean, default=False)    # User marked as "irrelevant"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('series_id', 'spotify_track_id', name='uq_preexisting_series_spotify'),
        UniqueConstraint('series_id', 'title_clean', name='uq_preexisting_series_titleclean'),
    )

class AlbumSeriesOverride(Base):
    __tablename__ = "album_series_overrides"
    
    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("album_series.id"), nullable=False, index=True)
    spotify_track_id = Column(String, nullable=True, index=True)
    title_clean = Column(String, nullable=True, index=True)
    linked_song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('series_id', 'spotify_track_id', name='uq_override_series_spotify'),
        UniqueConstraint('series_id', 'title_clean', name='uq_override_series_titleclean'),
    )

class WipCollaboration(Base):
    __tablename__ = "wip_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"))
    collaborator = Column(String)  # Username string for now
    field = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    song = relationship("Song")

class Authoring(Base):
    __tablename__ = "authoring"
    
    id = Column(Integer, primary_key=True, index=True)
    # Keep FK for ORM navigation, but don't rely on DB to enforce cascades
    song_id = Column(Integer, ForeignKey("songs.id"), unique=True, nullable=False)
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
    
    # Relationships
    song = relationship("Song", back_populates="authoring")

class FileLink(Base):
    __tablename__ = "file_links"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    file_url = Column(String)
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    song = relationship("Song")
    user = relationship("User")

class RockBandDLC(Base):
    __tablename__ = "rock_band_dlc"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    origin = Column(String, index=True)  # RB1, RB2, DLC, Beatles, etc.
    linked_song_id = Column(Integer, ForeignKey("songs.id"), nullable=True, index=True)  # Link to our songs if matched
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_dlc_artist_title', 'artist', 'title'),
        Index('idx_dlc_origin', 'origin'),
    )
    
    # Relationships
    linked_song = relationship("Song", foreign_keys=[linked_song_id])
