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
	# Balanced settings for development and production
	pool_size=5 if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else 8,
	max_overflow=10 if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else 12,
	pool_timeout=10,
	# Enable echo_pool to help debug connection issues (optional, can remove in production)
	echo_pool=False
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

	# Ensure feature_requests table has is_done column
	try:
		with engine.begin() as conn:
			cols = conn.exec_driver_sql("PRAGMA table_info(feature_requests)").fetchall()
			col_names = {row[1] for row in cols}
			if cols and "is_done" not in col_names:
				conn.exec_driver_sql("ALTER TABLE feature_requests ADD COLUMN is_done BOOLEAN DEFAULT 0")
				print("✅ Added is_done column to feature_requests table")
	except Exception as e:
		print(f"⚠️ Feature requests is_done column migration skipped or failed: {e}")

	# Ensure feature_request_comments table has parent_comment_id, is_edited, and is_deleted columns
	try:
		with engine.begin() as conn:
			cols = conn.exec_driver_sql("PRAGMA table_info(feature_request_comments)").fetchall()
			col_names = {row[1] for row in cols}
			if cols:
				if "parent_comment_id" not in col_names:
					conn.exec_driver_sql("ALTER TABLE feature_request_comments ADD COLUMN parent_comment_id INTEGER")
					conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_comments_parent ON feature_request_comments(parent_comment_id)")
					print("✅ Added parent_comment_id column to feature_request_comments table")
				if "is_edited" not in col_names:
					conn.exec_driver_sql("ALTER TABLE feature_request_comments ADD COLUMN is_edited BOOLEAN DEFAULT 0")
					print("✅ Added is_edited column to feature_request_comments table")
				if "is_deleted" not in col_names:
					conn.exec_driver_sql("ALTER TABLE feature_request_comments ADD COLUMN is_deleted BOOLEAN DEFAULT 0")
					print("✅ Added is_deleted column to feature_request_comments table")
	except Exception as e:
		print(f"⚠️ Feature request comments column migration skipped or failed: {e}")

	# Ensure activity_logs table exists
	try:
		with engine.begin() as conn:
			# Check if table exists
			table_exists = conn.exec_driver_sql(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'"
			).fetchone()
			
			if table_exists:
				# Table exists, check columns
				cols = conn.exec_driver_sql("PRAGMA table_info(activity_logs)").fetchall()
				col_names = {row[1] for row in cols}
				
				# If metadata column exists but metadata_json doesn't, rename it
				if "metadata" in col_names and "metadata_json" not in col_names:
					conn.exec_driver_sql("ALTER TABLE activity_logs RENAME COLUMN metadata TO metadata_json")
					print("✅ Renamed metadata column to metadata_json in activity_logs table")
			else:
				# Create table if missing
				conn.exec_driver_sql(
					"""
					CREATE TABLE IF NOT EXISTS activity_logs (
						id INTEGER PRIMARY KEY,
						user_id INTEGER NOT NULL,
						activity_type VARCHAR NOT NULL,
						description TEXT NOT NULL,
						metadata_json TEXT,
						created_at DATETIME,
						FOREIGN KEY (user_id) REFERENCES users(id)
					)
					"""
				)
				# Indexes
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_activity_user_type ON activity_logs(user_id, activity_type)")
				print("✅ Activity logs table created")
	except Exception as e:
		print(f"⚠️ Activity logs table migration skipped or failed: {e}")

	# Ensure users table has auto_spotify_fetch_enabled column
	try:
		with engine.begin() as conn:
			cols = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
			col_names = {row[1] for row in cols}
			if cols and "auto_spotify_fetch_enabled" not in col_names:
				conn.exec_driver_sql("ALTER TABLE users ADD COLUMN auto_spotify_fetch_enabled BOOLEAN DEFAULT 1")
				print("✅ Added auto_spotify_fetch_enabled column to users table")
	except Exception as e:
		print(f"⚠️ Users auto_spotify_fetch_enabled column migration skipped or failed: {e}")

	# Ensure achievements tables exist
	try:
		with engine.begin() as conn:
			# Check if achievements table exists
			table_exists = conn.exec_driver_sql(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='achievements'"
			).fetchone()
			
			if not table_exists:
				# Create achievements table
				conn.exec_driver_sql(
					"""
					CREATE TABLE IF NOT EXISTS achievements (
						id INTEGER PRIMARY KEY,
						code VARCHAR UNIQUE NOT NULL,
						name VARCHAR NOT NULL,
						description TEXT NOT NULL,
						icon VARCHAR NOT NULL,
						category VARCHAR NOT NULL,
						points INTEGER NOT NULL DEFAULT 10,
						rarity VARCHAR NOT NULL DEFAULT 'common',
						created_at DATETIME
					)
					"""
				)
				# Indexes
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_achievement_code ON achievements(code)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_achievement_category ON achievements(category)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_achievement_rarity ON achievements(rarity)")
				print("✅ Created achievements table")
			
			# Check if user_achievements table exists
			table_exists = conn.exec_driver_sql(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='user_achievements'"
			).fetchone()
			
			if not table_exists:
				# Create user_achievements table
				conn.exec_driver_sql(
					"""
					CREATE TABLE IF NOT EXISTS user_achievements (
						id INTEGER PRIMARY KEY,
						user_id INTEGER NOT NULL,
						achievement_id INTEGER NOT NULL,
						earned_at DATETIME,
						notified BOOLEAN DEFAULT 0,
						is_public BOOLEAN DEFAULT 1,
						FOREIGN KEY (user_id) REFERENCES users(id),
						FOREIGN KEY (achievement_id) REFERENCES achievements(id),
						UNIQUE(user_id, achievement_id)
					)
					"""
				)
				# Indexes
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_user_achievement_user ON user_achievements(user_id)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_user_achievement_achievement ON user_achievements(achievement_id)")
				conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_user_achievement_earned ON user_achievements(earned_at)")
				print("✅ Created user_achievements table")
			
			# Check if user_stats table exists
			table_exists = conn.exec_driver_sql(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='user_stats'"
			).fetchone()
			
			if not table_exists:
				# Create user_stats table
				conn.exec_driver_sql(
					"""
					CREATE TABLE IF NOT EXISTS user_stats (
						user_id INTEGER PRIMARY KEY,
						total_songs INTEGER DEFAULT 0,
						total_released INTEGER DEFAULT 0,
						total_future INTEGER DEFAULT 0,
						total_wip INTEGER DEFAULT 0,
						total_packs INTEGER DEFAULT 0,
						total_collaborations INTEGER DEFAULT 0,
						total_spotify_imports INTEGER DEFAULT 0,
						total_feature_requests INTEGER DEFAULT 0,
						login_streak INTEGER DEFAULT 0,
						last_login_date DATETIME,
						updated_at DATETIME,
						FOREIGN KEY (user_id) REFERENCES users(id)
					)
					"""
				)
				# Add missing columns if table exists but columns don't
				cols = conn.exec_driver_sql("PRAGMA table_info(user_stats)").fetchall()
				col_names = {row[1] for row in cols}
				if "total_future" not in col_names:
					conn.exec_driver_sql("ALTER TABLE user_stats ADD COLUMN total_future INTEGER DEFAULT 0")
				if "total_wip" not in col_names:
					conn.exec_driver_sql("ALTER TABLE user_stats ADD COLUMN total_wip INTEGER DEFAULT 0")
				print("✅ Created user_stats table")
	except Exception as e:
		print(f"⚠️ Achievements tables migration skipped or failed: {e}")

# Temporarily disabled connection monitoring to reduce overhead
# if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
# 	@event.listens_for(engine, "connect")
# 	def connect(dbapi_connection, connection_record):
# 		logging.info(f"New connection created. Pool status: {engine.pool.status()}")
# 
# 	@event.listens_for(engine, "checkout")
# 	def checkout(dbapi_connection, connection_record, connection_proxy):
# 		logging.info(f"Connection checked out. Pool status: {engine.pool.status()}")
# 
# 	@event.listens_for(engine, "checkin")
# 	def checkin(dbapi_connection, connection_record):
# 		logging.info(f"Connection returned. Pool status: {engine.pool.status()}")

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