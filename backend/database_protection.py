"""
Database protection utilities to prevent application crashes from bad data.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

def clean_datetime_strings(db: Session) -> int:
    """
    Clean up empty datetime strings in the database.
    Returns the number of fixes applied.
    """
    tables_and_columns = [
        ('songs', ['created_at', 'updated_at', 'released_at']),
        ('packs', ['created_at', 'updated_at', 'released_at']), 
        ('collaborations', ['created_at']),
        ('user_achievements', ['earned_at']),
        ('album_series', ['created_at', 'updated_at']),
        ('notifications', ['created_at', 'read_at']),
        ('users', ['created_at', 'last_login_at']),
    ]
    
    total_fixes = 0
    for table, columns in tables_and_columns:
        for column in columns:
            try:
                result = db.execute(text(f"""
                    UPDATE {table} 
                    SET {column} = NULL 
                    WHERE {column} = ''
                """))
                total_fixes += result.rowcount
                if result.rowcount > 0:
                    logger.info(f"Fixed {result.rowcount} empty datetime strings in {table}.{column}")
            except Exception as e:
                logger.warning(f"Could not clean {table}.{column}: {e}")
    
    if total_fixes > 0:
        db.commit()
        logger.info(f"Total datetime fixes applied: {total_fixes}")
    
    return total_fixes

def safe_query_with_cleanup(db: Session, query_func, max_retries: int = 1):
    """
    Execute a database query with automatic cleanup if datetime errors occur.
    
    Args:
        db: Database session
        query_func: Function that executes the query
        max_retries: Maximum number of cleanup attempts
    
    Returns:
        Query result or raises the original exception if cleanup doesn't help
    """
    for attempt in range(max_retries + 1):
        try:
            return query_func()
        except ValueError as e:
            if "Invalid isoformat string" in str(e) and attempt < max_retries:
                logger.warning(f"Detected bad datetime data, attempting cleanup (attempt {attempt + 1})")
                fixes_applied = clean_datetime_strings(db)
                if fixes_applied > 0:
                    logger.info(f"Applied {fixes_applied} fixes, retrying query")
                    continue
                else:
                    logger.warning("No fixes applied, query will likely fail again")
            raise
    
    # This shouldn't be reached, but just in case
    raise RuntimeError("Unexpected state in safe_query_with_cleanup")