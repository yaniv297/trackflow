"""
Custom Workflows Migration Script

This script handles the migration from the old fixed authoring system 
to the new flexible custom workflows system.

Migration Steps:
1. Create new workflow tables
2. Populate default workflow templates
3. Create user workflows for existing users
4. Migrate existing authoring data to song_progress
5. Verify data integrity
6. (Manual step) Remove old authoring table after verification

Usage:
    python migrations/custom_workflows_migration.py
"""

import sys
import os
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the path so we can import our models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Note: older versions referenced get_db_url(), but our database module
# exposes the URL via the DATABASE_URL env var. We'll read it directly.
from models import Base, User, Song, Authoring

def create_new_tables(engine):
    """Create the new workflow tables"""
    print("Creating new workflow tables...")
    with engine.begin() as conn:
        # Create workflow_templates table (SQLite-compatible)
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS workflow_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR NOT NULL,
            description TEXT,
            is_default BOOLEAN DEFAULT FALSE,
            is_system BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
        conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_workflow_template_name ON workflow_templates(name)
        """))
        
        # Create workflow_template_steps table (simplified - no category/description/required)
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS workflow_template_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
            step_name VARCHAR NOT NULL,
            display_name VARCHAR NOT NULL,
            order_index INTEGER NOT NULL,
            UNIQUE(template_id, step_name),
            UNIQUE(template_id, order_index)
        )
    """))
        conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_template_step_order ON workflow_template_steps(template_id, order_index)
        """))
        
        # Create user_workflows table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            description TEXT,
            template_id INTEGER REFERENCES workflow_templates(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        )
    """))
        conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_user_workflow_user ON user_workflows(user_id)
        """))
        
        # Create user_workflow_steps table (simplified - only core fields)
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_workflow_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL REFERENCES user_workflows(id) ON DELETE CASCADE,
            step_name VARCHAR NOT NULL,
            display_name VARCHAR NOT NULL,
            order_index INTEGER NOT NULL,
            UNIQUE(workflow_id, step_name),
            UNIQUE(workflow_id, order_index)
        )
    """))
        conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_workflow_step_order ON user_workflow_steps(workflow_id, order_index)
        """))
        
        # Create song_progress table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS song_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
            step_name VARCHAR NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(song_id, step_name)
        )
    """))
        conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_song_progress_lookup ON song_progress(song_id, step_name)
        """))
    
    print("✅ New workflow tables created successfully")

def populate_default_template(engine):
    """Populate the single default workflow template"""
    print("Populating default workflow template...")
    
    # Single default workflow - matches current authoring system
    default_template = {
        "name": "Standard Workflow",
        "description": "Default authoring workflow for Rock Band songs",
        "is_default": True,
        "steps": [
            ("tempo_map", "Tempo Map", 0),
            ("drums", "Drums", 1),
            ("bass", "Bass", 2),
            ("guitar", "Guitar", 3),
            ("vocals", "Vocals", 4),
            ("harmonies", "Harmonies", 5),
            ("pro_keys", "Pro Keys", 6),
            ("keys", "Keys", 7),
            ("venue", "Venue", 8),
            ("animations", "Animations", 9),
            ("drum_fills", "Drum Fills", 10),
            ("overdrive", "Overdrive", 11),
            ("compile", "Compile", 12),
        ]
    }
    
    # Insert template
    with engine.begin() as conn:
        conn.execute(text("""
        INSERT INTO workflow_templates (name, description, is_default, is_system)
        VALUES (:name, :description, :is_default, TRUE)
        """), {
            "name": default_template["name"],
            "description": default_template["description"],
            "is_default": default_template["is_default"]
        })
        # Fetch inserted id (SQLite-compatible)
        result = conn.execute(text("SELECT id FROM workflow_templates WHERE is_default = TRUE LIMIT 1"))
        template_id = result.fetchone()[0]
        
        # Insert steps
        for step_name, display_name, order_index in default_template["steps"]:
            conn.execute(text("""
                INSERT INTO workflow_template_steps 
                (template_id, step_name, display_name, order_index)
                VALUES (:template_id, :step_name, :display_name, :order_index)
            """), {
                "template_id": template_id,
                "step_name": step_name,
                "display_name": display_name,
                "order_index": order_index
            })
    
    print("✅ Default workflow template populated successfully")

def create_user_workflows(engine):
    """Create user workflows for existing users based on the default template"""
    print("Creating user workflows for existing users...")
    with engine.begin() as conn:
        # Get the default template ID
        result = conn.execute(text("SELECT id FROM workflow_templates WHERE is_default = TRUE LIMIT 1"))
        row = result.fetchone()
        if not row:
            raise RuntimeError("Default workflow template not found after insert")
        default_template_id = row[0]
        
        # Get all users
        users = conn.execute(text("SELECT id FROM users")).fetchall()
        
        for user_row in users:
            user_id = user_row[0]
            
            # Create user workflow based on default template
            result = conn.execute(text("""
                INSERT INTO user_workflows (user_id, name, description, template_id)
                VALUES (:user_id, 'My Workflow', 'Customized workflow based on Standard Rock Band template', :template_id)
                RETURNING id
            """), {
                "user_id": user_id,
                "template_id": default_template_id
            })
            workflow_id = result.fetchone()[0]
            
            # Copy steps from default template to user workflow
            conn.execute(text("""
                INSERT INTO user_workflow_steps 
                (workflow_id, step_name, display_name, order_index)
                SELECT :workflow_id, step_name, display_name, order_index
                FROM workflow_template_steps 
                WHERE template_id = :template_id
                ORDER BY order_index
            """), {
                "workflow_id": workflow_id,
                "template_id": default_template_id
            })

    print(f"✅ Created workflows for {len(users)} users")

def migrate_authoring_data(engine):
    """Migrate existing authoring data to the new song_progress table"""
    print("Migrating existing authoring data...")
    with engine.begin() as conn:
        # Get all authoring records with their songs and song owners
        authoring_data = conn.execute(text("""
        SELECT a.song_id, s.user_id, a.demucs, a.midi, a.tempo_map, a.fake_ending,
               a.drums, a.bass, a.guitar, a.vocals, a.harmonies, a.pro_keys,
               a.keys, a.animations, a.drum_fills, a.overdrive, a.compile
        FROM authoring a
        JOIN songs s ON a.song_id = s.id
    """)).fetchall()
        
        # Map of old field names to new step names (they should be the same)
        field_mapping = {
            "demucs": "demucs",
            "midi": "midi", 
            "tempo_map": "tempo_map",
            "fake_ending": "fake_ending",
            "drums": "drums",
            "bass": "bass",
            "guitar": "guitar",
            "vocals": "vocals",
            "harmonies": "harmonies",
            "pro_keys": "pro_keys",
            "keys": "keys",
            "animations": "animations",
            "drum_fills": "drum_fills",
            "overdrive": "overdrive",
            "compile": "compile"
        }
        
        migrated_songs = 0
        for authoring_row in authoring_data:
            song_id = authoring_row[0]
            user_id = authoring_row[1]
            
            # Get the user's workflow steps to ensure we only create progress for their current workflow
            user_steps = conn.execute(text("""
                SELECT uws.step_name
                FROM user_workflow_steps uws
                JOIN user_workflows uw ON uws.workflow_id = uw.id
                WHERE uw.user_id = :user_id
            """), {"user_id": user_id}).fetchall()
            
            user_step_names = {row[0] for row in user_steps}
            
            # Create progress records for each completed step
            for i, field_name in enumerate(field_mapping.keys()):
                step_name = field_mapping[field_name]
                is_completed = bool(authoring_row[i + 2])  # +2 to skip song_id and user_id
                
                # Only create progress for steps that exist in the user's current workflow
                if step_name in user_step_names:
                    completed_at = datetime.utcnow() if is_completed else None
                    
                    conn.execute(text("""
                        INSERT INTO song_progress (song_id, step_name, is_completed, completed_at)
                        VALUES (:song_id, :step_name, :is_completed, :completed_at)
                        ON CONFLICT (song_id, step_name) DO NOTHING
                    """), {
                        "song_id": song_id,
                        "step_name": step_name,
                        "is_completed": is_completed,
                        "completed_at": completed_at
                    })
            
            migrated_songs += 1
    
    print(f"✅ Migrated authoring data for {migrated_songs} songs")

def verify_migration(engine):
    """Verify the migration was successful"""
    print("Verifying migration...")
    with engine.begin() as conn:
        # Check table counts
        template_count = conn.execute(text("SELECT COUNT(*) FROM workflow_templates")).fetchone()[0]
        template_step_count = conn.execute(text("SELECT COUNT(*) FROM workflow_template_steps")).fetchone()[0]
        user_workflow_count = conn.execute(text("SELECT COUNT(*) FROM user_workflows")).fetchone()[0]
        user_step_count = conn.execute(text("SELECT COUNT(*) FROM user_workflow_steps")).fetchone()[0]
        progress_count = conn.execute(text("SELECT COUNT(*) FROM song_progress")).fetchone()[0]

        print(f"📊 Migration Results:")
        print(f"   - Workflow templates: {template_count}")
        print(f"   - Template steps: {template_step_count}")
        print(f"   - User workflows: {user_workflow_count}")
        print(f"   - User workflow steps: {user_step_count}")
        print(f"   - Song progress records: {progress_count}")
        
        # Verify data integrity
        orphaned_steps = conn.execute(text("""
            SELECT COUNT(*) FROM user_workflow_steps uws
            LEFT JOIN user_workflows uw ON uws.workflow_id = uw.id
            WHERE uw.id IS NULL
        """)).fetchone()[0]
        
        orphaned_progress = conn.execute(text("""
            SELECT COUNT(*) FROM song_progress sp
            LEFT JOIN songs s ON sp.song_id = s.id
            WHERE s.id IS NULL
        """)).fetchone()[0]
     
    if orphaned_steps == 0 and orphaned_progress == 0:
        print("✅ Data integrity verification passed")
    else:
        print(f"⚠️  Found {orphaned_steps} orphaned workflow steps and {orphaned_progress} orphaned progress records")
    
    return template_count > 0 and user_workflow_count > 0

def main():
    """Run the complete migration"""
    print("🚀 Starting Custom Workflows Migration")
    print("=" * 50)
    
    try:
        # Connect to database
        db_url = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
        engine = create_engine(db_url)
        
        # Run migration steps
        create_new_tables(engine)
        populate_default_template(engine)
        create_user_workflows(engine)
        migrate_authoring_data(engine)
        
        # Verify migration
        if verify_migration(engine):
            print("\n🎉 Migration completed successfully!")
            print("\nNext steps:")
            print("1. Test the new workflow system thoroughly")
            print("2. Update the frontend to use the new API endpoints") 
            print("3. After confirming everything works, run:")
            print("   DROP TABLE authoring CASCADE;")
            print("   (This will remove the old authoring table)")
        else:
            print("\n❌ Migration verification failed!")
            return 1
            
    except Exception as e:
        print(f"\n💥 Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
