"""
Migration script to ensure workflow tables exist.
This creates user_workflows, user_workflow_steps, workflow_templates, 
workflow_template_steps, and song_progress tables if they don't exist.
Supports both SQLite and PostgreSQL.
"""

from sqlalchemy import text, inspect
from database import engine, SQLALCHEMY_DATABASE_URL


def run_migration():
    """Create workflow tables if they don't exist."""
    print("🔄 Ensuring workflow tables exist...")
    
    is_postgres = SQLALCHEMY_DATABASE_URL.startswith("postgresql")
    is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    
    # Determine primary key and auto-increment syntax
    if is_postgres:
        pk_type = "SERIAL PRIMARY KEY"
        timestamp_default = "DEFAULT CURRENT_TIMESTAMP"
    else:  # SQLite
        pk_type = "INTEGER PRIMARY KEY AUTOINCREMENT"
        timestamp_default = "DEFAULT CURRENT_TIMESTAMP"
    
    with engine.connect() as conn:
        # Check if tables exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # Create workflow_templates table
        if "workflow_templates" not in existing_tables:
            print("  Creating workflow_templates table...")
            conn.execute(text(f"""
                CREATE TABLE workflow_templates (
                    id {pk_type},
                    name VARCHAR NOT NULL,
                    description TEXT,
                    is_default BOOLEAN DEFAULT FALSE,
                    is_system BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP {timestamp_default}
                )
            """))
            if not is_sqlite:  # SQLite doesn't support explicit commits in autocommit mode
                conn.commit()
            print("  ✅ Created workflow_templates table")
        else:
            print("  ✅ workflow_templates table already exists")
        
        # Create workflow_template_steps table
        if "workflow_template_steps" not in existing_tables:
            print("  Creating workflow_template_steps table...")
            conn.execute(text(f"""
                CREATE TABLE workflow_template_steps (
                    id {pk_type},
                    template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
                    step_name VARCHAR NOT NULL,
                    display_name VARCHAR NOT NULL,
                    description TEXT,
                    order_index INTEGER NOT NULL,
                    is_required BOOLEAN DEFAULT TRUE,
                    category VARCHAR,
                    UNIQUE(template_id, step_name),
                    UNIQUE(template_id, order_index)
                )
            """))
            # Create index for performance
            try:
                conn.execute(text("""
                    CREATE INDEX idx_template_step_order ON workflow_template_steps(template_id, order_index)
                """))
            except Exception as e:
                print(f"  ⚠️  Index creation skipped (may already exist): {e}")
            if not is_sqlite:
                conn.commit()
            print("  ✅ Created workflow_template_steps table")
        else:
            print("  ✅ workflow_template_steps table already exists")
        
        # Create user_workflows table
        if "user_workflows" not in existing_tables:
            print("  Creating user_workflows table...")
            conn.execute(text(f"""
                CREATE TABLE user_workflows (
                    id {pk_type},
                    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR NOT NULL,
                    description TEXT,
                    template_id INTEGER REFERENCES workflow_templates(id),
                    created_at TIMESTAMP {timestamp_default},
                    updated_at TIMESTAMP {timestamp_default}
                )
            """))
            # Create index for performance
            try:
                conn.execute(text("""
                    CREATE INDEX idx_user_workflows_user_id ON user_workflows(user_id)
                """))
            except Exception as e:
                print(f"  ⚠️  Index creation skipped (may already exist): {e}")
            if not is_sqlite:
                conn.commit()
            print("  ✅ Created user_workflows table")
        else:
            print("  ✅ user_workflows table already exists")
        
        # Create user_workflow_steps table
        if "user_workflow_steps" not in existing_tables:
            print("  Creating user_workflow_steps table...")
            conn.execute(text(f"""
                CREATE TABLE user_workflow_steps (
                    id {pk_type},
                    workflow_id INTEGER NOT NULL REFERENCES user_workflows(id) ON DELETE CASCADE,
                    step_name VARCHAR NOT NULL,
                    display_name VARCHAR NOT NULL,
                    description TEXT,
                    order_index INTEGER NOT NULL,
                    is_required BOOLEAN DEFAULT TRUE,
                    category VARCHAR,
                    is_enabled BOOLEAN DEFAULT TRUE,
                    UNIQUE(workflow_id, step_name),
                    UNIQUE(workflow_id, order_index)
                )
            """))
            # Create index for performance
            try:
                conn.execute(text("""
                    CREATE INDEX idx_workflow_step_order ON user_workflow_steps(workflow_id, order_index)
                """))
            except Exception as e:
                print(f"  ⚠️  Index creation skipped (may already exist): {e}")
            if not is_sqlite:
                conn.commit()
            print("  ✅ Created user_workflow_steps table")
        else:
            print("  ✅ user_workflow_steps table already exists")
        
        # Create song_progress table (if not already exists from models.py)
        if "song_progress" not in existing_tables:
            print("  Creating song_progress table...")
            conn.execute(text(f"""
                CREATE TABLE song_progress (
                    id {pk_type},
                    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
                    step_name VARCHAR NOT NULL,
                    is_completed BOOLEAN DEFAULT FALSE,
                    completed_at TIMESTAMP,
                    notes TEXT,
                    created_at TIMESTAMP {timestamp_default},
                    updated_at TIMESTAMP {timestamp_default},
                    UNIQUE(song_id, step_name)
                )
            """))
            # Create indexes for performance
            try:
                conn.execute(text("""
                    CREATE INDEX idx_song_progress_lookup ON song_progress(song_id, step_name)
                """))
            except Exception as e:
                print(f"  ⚠️  Index creation skipped (may already exist): {e}")
            if not is_sqlite:
                conn.commit()
            print("  ✅ Created song_progress table")
        else:
            print("  ✅ song_progress table already exists")
    
    print("✅ Workflow tables migration completed!")


if __name__ == "__main__":
    run_migration()
