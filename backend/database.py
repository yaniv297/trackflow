# backend/database.py

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from models import Base
import os
import logging

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
	connect_args["connect_timeout"] = 5
	connect_args["application_name"] = "trackflow"

engine = create_engine(
	SQLALCHEMY_DATABASE_URL, 
	connect_args=connect_args,
	pool_pre_ping=True,
	pool_recycle=600,
	# Optimize pool size for SQLite (smaller pool to avoid locks)
	# Increased pool size for PostgreSQL to handle concurrent async requests
	pool_size=1 if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else 3,
	max_overflow=0 if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else 5,
	pool_timeout=10,
	# Enable echo_pool to help debug connection issues (optional, can remove in production)
	echo_pool=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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

# Add connection pool monitoring for PostgreSQL
if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
	@event.listens_for(engine, "connect")
	def connect(dbapi_connection, connection_record):
		logging.info(f"New connection created. Pool status: {engine.pool.status()}")

	@event.listens_for(engine, "checkout")
	def checkout(dbapi_connection, connection_record, connection_proxy):
		logging.info(f"Connection checked out. Pool status: {engine.pool.status()}")

	@event.listens_for(engine, "checkin")
	def checkin(dbapi_connection, connection_record):
		logging.info(f"Connection returned. Pool status: {engine.pool.status()}")

# Dependency for FastAPI
def get_db():
	db = SessionLocal()
	try:
		yield db
	except Exception as e:
		# Rollback on any exception to ensure clean state
		db.rollback()
		raise
	finally:
		# Always close the session to return connection to pool
		db.close()