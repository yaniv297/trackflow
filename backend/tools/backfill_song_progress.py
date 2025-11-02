"""
Backfill song_progress from legacy authoring.

Rules:
- Create/refresh song_progress rows for each legacy boolean field per song.
- For songs whose legacy authoring has all booleans True, any missing steps in the
  owner's current workflow are inserted as completed (preserve finished state).

Usage:
  cd trackflow/backend
  ../../venv/bin/python tools/backfill_song_progress.py
"""

import os
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
engine = create_engine(DB_URL)

LEGACY_FIELDS = [
    "demucs", "midi", "tempo_map", "fake_ending", "drums", "bass", "guitar",
    "vocals", "harmonies", "pro_keys", "keys", "animations", "drum_fills",
    "overdrive", "compile",
]

def main():
    with engine.begin() as conn:
        songs = conn.execute(text("SELECT id, user_id FROM songs")).fetchall()

        for song_id, user_id in songs:
            a = conn.execute(text("SELECT * FROM authoring WHERE song_id = :sid"), {"sid": song_id}).fetchone()
            if not a:
                continue

            # Map legacy fields to song_progress
            for field in LEGACY_FIELDS:
                val = a._mapping.get(field, 0)
                is_completed = 1 if val else 0
                conn.execute(text(
                    """
                    INSERT INTO song_progress (song_id, step_name, is_completed, completed_at, created_at, updated_at)
                    VALUES (:sid, :step, :done, CASE WHEN :done=1 THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT(song_id, step_name) DO UPDATE SET
                      is_completed = :done,
                      completed_at = CASE WHEN :done=1 THEN CURRENT_TIMESTAMP ELSE completed_at END,
                      updated_at = CURRENT_TIMESTAMP
                    """
                ), {"sid": song_id, "step": field, "done": is_completed})

            # If legacy shows all done, ensure any workflow-only steps are also completed
            all_done = all(a._mapping.get(f, 0) == 1 for f in LEGACY_FIELDS)
            if all_done:
                wf_steps = conn.execute(text(
                    """
                    SELECT uws.step_name
                    FROM user_workflows uw
                    JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
                    WHERE uw.user_id = :uid
                    """
                ), {"uid": user_id}).fetchall()
                for (step_name,) in wf_steps:
                    conn.execute(text(
                        """
                        INSERT INTO song_progress (song_id, step_name, is_completed, completed_at, created_at, updated_at)
                        VALUES (:sid, :step, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT(song_id, step_name) DO UPDATE SET
                          is_completed = 1,
                          completed_at = CURRENT_TIMESTAMP,
                          updated_at = CURRENT_TIMESTAMP
                        """
                    ), {"sid": song_id, "step": step_name})

    print("✅ Backfill completed")

if __name__ == "__main__":
    main()




