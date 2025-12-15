from sqlalchemy import create_engine, text
import os
import sys

# Ensure we can import the main app's database module when run from project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from database import get_db


def add_related_song_to_notifications():
    """Add related_song_id column to notifications table if it does not exist.

    This is a lightweight, SQLite-safe migration used during development.
    It is safe to run multiple times.
    """
    # Reuse the same database configuration as the app by borrowing a session
    db = next(get_db())
    engine = db.get_bind()

    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("PRAGMA table_info(notifications);"))
        columns = [row[1] for row in result.fetchall()]
        if "related_song_id" in columns:
            print("related_song_id already exists on notifications table")
            return

        print("Adding related_song_id column to notifications table...")
        conn.execute(
            text(
                "ALTER TABLE notifications "
                "ADD COLUMN related_song_id INTEGER REFERENCES songs(id);"
            )
        )
        print("✅ related_song_id column added to notifications table")


if __name__ == "__main__":
    add_related_song_to_notifications()
