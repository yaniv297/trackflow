# backend/database.py

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import sessionmaker
from models import Base
import os
import logging

SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.vhydslrserhdzzqmytie:vyhzwSBNFCVgj2oR@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
)

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
    # SSL configuration for Supabase/PostgreSQL
    # Use 'require' for Supabase pooler to ensure SSL connections
    connect_args["sslmode"] = "require"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,  # Verify connections before using them (handles dead connections)
    pool_recycle=180,  # Recycle connections after 3 minutes (Supabase pooler timeout is often 5-10 min)
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
        try:
            db.rollback()
        except Exception:
            # If rollback fails (e.g., connection is dead), invalidate the session
            db.expire_all()
        raise
    finally:
        # Always close the session to return connection to pool
        try:
            db.close()
        except Exception:
            # If close fails, the connection is likely already dead
            # The pool will handle cleanup via pool_pre_ping
            pass
