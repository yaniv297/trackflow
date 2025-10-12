"""
One-time cleanup script to drop unused columns introduced by early workflow drafts.

This is SAFE for SQLite. It will:
1) Rebuild workflow_template_steps without description/is_required/category
2) Rebuild user_workflow_steps without description/is_required/category/is_enabled

Usage:
  cd trackflow/backend
  ../../venv/bin/python tools/cleanup_workflow_columns.py
"""

import os
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
engine = create_engine(DB_URL)

def column_exists(conn, table, column):
    rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
    return column in {r[1] for r in rows}

def rebuild_table(conn, table, create_sql, copy_sql, temp_table_name):
    conn.exec_driver_sql("BEGIN")
    try:
        conn.exec_driver_sql(create_sql)
        conn.exec_driver_sql(f"INSERT INTO {temp_table_name} {copy_sql}")
        conn.exec_driver_sql(f"DROP TABLE {table}")
        conn.exec_driver_sql(f"ALTER TABLE {temp_table_name} RENAME TO {table}")
        conn.exec_driver_sql("COMMIT")
    except Exception:
        conn.exec_driver_sql("ROLLBACK")
        raise

def main():
    with engine.begin() as conn:
        # workflow_template_steps cleanup
        if column_exists(conn, "workflow_template_steps", "description") or \
           column_exists(conn, "workflow_template_steps", "is_required") or \
           column_exists(conn, "workflow_template_steps", "category"):
            rebuild_table(
                conn,
                "workflow_template_steps",
                """
                CREATE TABLE workflow_template_steps_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
                    step_name VARCHAR NOT NULL,
                    display_name VARCHAR NOT NULL,
                    order_index INTEGER NOT NULL,
                    UNIQUE(template_id, step_name),
                    UNIQUE(template_id, order_index)
                )
                """,
                "SELECT id, template_id, step_name, display_name, order_index FROM workflow_template_steps",
                "workflow_template_steps_new",
            )

        # user_workflow_steps cleanup
        if column_exists(conn, "user_workflow_steps", "description") or \
           column_exists(conn, "user_workflow_steps", "is_required") or \
           column_exists(conn, "user_workflow_steps", "category") or \
           column_exists(conn, "user_workflow_steps", "is_enabled"):
            rebuild_table(
                conn,
                "user_workflow_steps",
                """
                CREATE TABLE user_workflow_steps_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    workflow_id INTEGER NOT NULL REFERENCES user_workflows(id) ON DELETE CASCADE,
                    step_name VARCHAR NOT NULL,
                    display_name VARCHAR NOT NULL,
                    order_index INTEGER NOT NULL,
                    UNIQUE(workflow_id, step_name),
                    UNIQUE(workflow_id, order_index)
                )
                """,
                "SELECT id, workflow_id, step_name, display_name, order_index FROM user_workflow_steps",
                "user_workflow_steps_new",
            )

        # Indices
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_template_step_order ON workflow_template_steps(template_id, order_index)")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_workflow_step_order ON user_workflow_steps(workflow_id, order_index)")

    print("✅ Workflow tables cleaned up successfully")

if __name__ == "__main__":
    main()


