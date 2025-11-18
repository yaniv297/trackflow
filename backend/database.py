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
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

# Safe migrations - don't block server startup
def run_migrations():
    """Run database migrations safely without blocking startup"""
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return
    
    print("🔄 Running database migrations...")
    
def _safe_migration(migration_name: str, migration_func):
    """Wrapper to safely run migrations without crashing server"""
    try:
        migration_func()
        print(f"✅ {migration_name} migration completed")
    except Exception as e:
        print(f"⚠️ {migration_name} migration failed (non-critical): {e}")
        # Don't re-raise - let server continue

# Migrations moved to main.py startup event - not running on every import


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
#     @event.listens_for(engine, "connect")
#     def connect(dbapi_connection, connection_record):
#         logging.info(f"New connection created. Pool status: {engine.pool.status()}")
# 
#     @event.listens_for(engine, "checkout")
#     def checkout(dbapi_connection, connection_record, connection_proxy):
#         logging.info(f"Connection checked out. Pool status: {engine.pool.status()}")
# 
#     @event.listens_for(engine, "checkin")
#     def checkin(dbapi_connection, connection_record):
#         logging.info(f"Connection returned. Pool status: {engine.pool.status()}")

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
