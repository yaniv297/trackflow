# backend/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os

SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")

# Only use check_same_thread for SQLite
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
	connect_args["check_same_thread"] = False
	connect_args["timeout"] = 60  # 60 second timeout
	connect_args["isolation_level"] = None  # Autocommit mode
	# Add WAL mode for better concurrency
	connect_args["uri"] = True
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
	# Optimize for PostgreSQL/Supabase
	connect_args["connect_timeout"] = 10
	connect_args["application_name"] = "trackflow"

engine = create_engine(
	SQLALCHEMY_DATABASE_URL, 
	connect_args=connect_args,
	pool_pre_ping=True,
	pool_recycle=300,
	# Optimize pool size for SQLite (smaller pool to avoid locks)
	pool_size=1 if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else 5,
	max_overflow=0 if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else 10,
	pool_timeout=30
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

print(f"📦 Connected to database: {SQLALCHEMY_DATABASE_URL}")

# Lightweight migration for SQLite: add column if missing
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
	try:
		with engine.begin() as conn:
			# Check if column exists
			cols = conn.exec_driver_sql("PRAGMA table_info(songs)").fetchall()
			col_names = {row[1] for row in cols}
			if "album_series_id" not in col_names:
				conn.exec_driver_sql("ALTER TABLE songs ADD COLUMN album_series_id INTEGER")
				# Optional: add index to improve lookups
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_song_album_series_id ON songs(album_series_id)")
	except Exception as e:
		print(f"⚠️ Migration check failed or not needed: {e}")

	# Ensure album_series_preexisting has expected columns
	try:
		with engine.begin() as conn:
			cols = conn.exec_driver_sql("PRAGMA table_info(album_series_preexisting)").fetchall()
			col_names = {row[1] for row in cols}
			# Table may not exist yet (fresh install); create_all will handle creation
			if cols:
				if "created_at" not in col_names:
					conn.exec_driver_sql("ALTER TABLE album_series_preexisting ADD COLUMN created_at DATETIME")
				if "updated_at" not in col_names:
					conn.exec_driver_sql("ALTER TABLE album_series_preexisting ADD COLUMN updated_at DATETIME")
				# Helpful index for queries by series
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_preexisting_series_id ON album_series_preexisting(series_id)")
	except Exception as e:
		print(f"⚠️ Preexisting table migration skipped or failed: {e}")

	# Ensure album_series_overrides table exists
	try:
		with engine.begin() as conn:
			# Create table if missing
			conn.exec_driver_sql(
				"""
				CREATE TABLE IF NOT EXISTS album_series_overrides (
					id INTEGER PRIMARY KEY,
					series_id INTEGER NOT NULL,
					spotify_track_id VARCHAR,
					title_clean VARCHAR,
					linked_song_id INTEGER NOT NULL,
					created_at DATETIME,
					updated_at DATETIME
				)
				"""
			)
			# Indexes
			conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_overrides_series ON album_series_overrides(series_id)")
			conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_overrides_spotify ON album_series_overrides(spotify_track_id)")
			conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_overrides_title ON album_series_overrides(title_clean)")
	except Exception as e:
		print(f"⚠️ Overrides table migration skipped or failed: {e}")

# Dependency for FastAPI
def get_db():
	db = SessionLocal()
	print(f"📦 Connected to database: {SQLALCHEMY_DATABASE_URL}")
	try:
		yield db
	finally:
		db.close()