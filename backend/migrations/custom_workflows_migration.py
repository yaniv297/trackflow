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

from database import get_db_url
from models import Base, User, Song, Authoring

def create_new_tables(engine):
    """Create the new workflow tables"""
    print("Creating new workflow tables...")
    
    # Create workflow_templates table
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS workflow_templates (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            description TEXT,
            is_default BOOLEAN DEFAULT FALSE,
            is_system BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_workflow_template_name ON workflow_templates(name);
    """))
    
    # Create workflow_template_steps table
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS workflow_template_steps (
            id SERIAL PRIMARY KEY,
            template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
            step_name VARCHAR NOT NULL,
            display_name VARCHAR NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL,
            is_required BOOLEAN DEFAULT TRUE,
            category VARCHAR,
            UNIQUE(template_id, step_name),
            UNIQUE(template_id, order_index)
        );
        CREATE INDEX IF NOT EXISTS idx_template_step_order ON workflow_template_steps(template_id, order_index);
    """))
    
    # Create user_workflows table
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS user_workflows (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            description TEXT,
            template_id INTEGER REFERENCES workflow_templates(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_workflow_user ON user_workflows(user_id);
    """))
    
    # Create user_workflow_steps table
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS user_workflow_steps (
            id SERIAL PRIMARY KEY,
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
        );
        CREATE INDEX IF NOT EXISTS idx_workflow_step_order ON user_workflow_steps(workflow_id, order_index);
    """))
    
    # Create song_progress table
    engine.execute(text("""
        CREATE TABLE IF NOT EXISTS song_progress (
            id SERIAL PRIMARY KEY,
            song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
            step_name VARCHAR NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(song_id, step_name)
        );
        CREATE INDEX IF NOT EXISTS idx_song_progress_lookup ON song_progress(song_id, step_name);
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
            ("demucs", "Demucs", 0, True, "preparation"),
            ("midi", "MIDI", 1, True, "preparation"),
            ("tempo_map", "Tempo Map", 2, True, "preparation"),
            ("fake_ending", "Fake Ending", 3, True, "preparation"),
            ("drums", "Drums", 4, True, "tracking"),
            ("bass", "Bass", 5, True, "tracking"),
            ("guitar", "Guitar", 6, True, "tracking"),
            ("vocals", "Vocals", 7, True, "tracking"),
            ("harmonies", "Harmonies", 8, True, "tracking"),
            ("pro_keys", "Pro Keys", 9, True, "tracking"),
            ("keys", "Keys", 10, True, "tracking"),
            ("animations", "Animations", 11, True, "authoring"),
            ("drum_fills", "Drum Fills", 12, True, "authoring"),
            ("overdrive", "Overdrive", 13, True, "authoring"),
            ("compile", "Compile", 14, True, "finishing"),
        ]
    }
    
    # Insert template
    result = engine.execute(text("""
        INSERT INTO workflow_templates (name, description, is_default, is_system)
        VALUES (:name, :description, :is_default, TRUE)
        RETURNING id
    """), {
        "name": default_template["name"],
        "description": default_template["description"],
        "is_default": default_template["is_default"]
    })
    template_id = result.fetchone()[0]
    
    # Insert steps
    for step_name, display_name, order_index, is_required, category in default_template["steps"]:
        engine.execute(text("""
            INSERT INTO workflow_template_steps 
            (template_id, step_name, display_name, order_index, is_required, category)
            VALUES (:template_id, :step_name, :display_name, :order_index, :is_required, :category)
        """), {
            "template_id": template_id,
            "step_name": step_name,
            "display_name": display_name,
            "order_index": order_index,
            "is_required": is_required,
            "category": category
        })
    
    print("✅ Default workflow template populated successfully")

def create_user_workflows(engine):
    """Create user workflows for existing users based on the default template"""
    print("Creating user workflows for existing users...")
    
    # Get the default template ID
    result = engine.execute(text("SELECT id FROM workflow_templates WHERE is_default = TRUE LIMIT 1"))
    default_template_id = result.fetchone()[0]
    
    # Get all users
    users = engine.execute(text("SELECT id FROM users")).fetchall()
    
    for user_row in users:
        user_id = user_row[0]
        
        # Create user workflow based on default template
        result = engine.execute(text("""
            INSERT INTO user_workflows (user_id, name, description, template_id)
            VALUES (:user_id, 'My Workflow', 'Customized workflow based on Standard Rock Band template', :template_id)
            RETURNING id
        """), {
            "user_id": user_id,
            "template_id": default_template_id
        })
        workflow_id = result.fetchone()[0]
        
        # Copy steps from default template to user workflow
        engine.execute(text("""
            INSERT INTO user_workflow_steps 
            (workflow_id, step_name, display_name, description, order_index, is_required, category, is_enabled)
            SELECT :workflow_id, step_name, display_name, description, order_index, is_required, category, TRUE
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
    
    # Get all authoring records with their songs and song owners
    authoring_data = engine.execute(text("""
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
        user_steps = engine.execute(text("""
            SELECT uws.step_name
            FROM user_workflow_steps uws
            JOIN user_workflows uw ON uws.workflow_id = uw.id
            WHERE uw.user_id = :user_id AND uws.is_enabled = TRUE
        """), {"user_id": user_id}).fetchall()
        
        user_step_names = {row[0] for row in user_steps}
        
        # Create progress records for each completed step
        for i, field_name in enumerate(field_mapping.keys()):
            step_name = field_mapping[field_name]
            is_completed = bool(authoring_row[i + 2])  # +2 to skip song_id and user_id
            
            # Only create progress for steps that exist in the user's current workflow
            if step_name in user_step_names:
                completed_at = datetime.utcnow() if is_completed else None
                
                engine.execute(text("""
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
    
    # Check table counts
    template_count = engine.execute(text("SELECT COUNT(*) FROM workflow_templates")).fetchone()[0]
    template_step_count = engine.execute(text("SELECT COUNT(*) FROM workflow_template_steps")).fetchone()[0]
    user_workflow_count = engine.execute(text("SELECT COUNT(*) FROM user_workflows")).fetchone()[0]
    user_step_count = engine.execute(text("SELECT COUNT(*) FROM user_workflow_steps")).fetchone()[0]
    progress_count = engine.execute(text("SELECT COUNT(*) FROM song_progress")).fetchone()[0]
    
    print(f"📊 Migration Results:")
    print(f"   - Workflow templates: {template_count}")
    print(f"   - Template steps: {template_step_count}")
    print(f"   - User workflows: {user_workflow_count}")
    print(f"   - User workflow steps: {user_step_count}")
    print(f"   - Song progress records: {progress_count}")
    
    # Verify data integrity
    orphaned_steps = engine.execute(text("""
        SELECT COUNT(*) FROM user_workflow_steps uws
        LEFT JOIN user_workflows uw ON uws.workflow_id = uw.id
        WHERE uw.id IS NULL
    """)).fetchone()[0]
    
    orphaned_progress = engine.execute(text("""
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
        db_url = get_db_url()
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
