"""
Update the default workflow template in-place to the new step order.

New default steps:
tempo_map, drums, bass, guitar, vocals, harmonies, pro_keys, keys, venue,
animations, drum_fills, overdrive, compile

Usage:
  cd trackflow/backend
  ../../venv/bin/activate && python tools/update_default_workflow_template.py
"""

import os
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
engine = create_engine(DB_URL)

NEW_STEPS = [
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

def main():
    with engine.begin() as conn:
        # Ensure a default template exists
        tmpl = conn.execute(text("SELECT id FROM workflow_templates WHERE is_default = 1 LIMIT 1")).fetchone()
        if not tmpl:
            # Create one if missing
            conn.execute(text(
                """
                INSERT INTO workflow_templates (name, description, is_default, is_system)
                VALUES ('Standard Workflow', 'Default authoring workflow', 1, 1)
                """
            ))
            tmpl = conn.execute(text("SELECT id FROM workflow_templates WHERE is_default = 1 LIMIT 1")).fetchone()
        template_id = tmpl[0]

        # Replace steps
        conn.execute(text("DELETE FROM workflow_template_steps WHERE template_id = :tid"), {"tid": template_id})
        for step_name, display_name, order_index in NEW_STEPS:
            conn.execute(text(
                """
                INSERT INTO workflow_template_steps (template_id, step_name, display_name, order_index)
                VALUES (:tid, :sn, :dn, :oi)
                """
            ), {"tid": template_id, "sn": step_name, "dn": display_name, "oi": order_index})

    print("✅ Default workflow template updated.")

if __name__ == "__main__":
    main()




