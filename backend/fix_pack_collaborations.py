#!/usr/bin/env python3

import sqlite3
import os

def fix_pack_collaborations():
    """Fix pack_collaborations table to use pack_id instead of pack_name strings"""
    
    # Connect to the database
    db_path = "songs.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Fixing pack_collaborations table...")
    
    # Get all pack collaborations that need to be updated
    cursor.execute("""
        SELECT id, pack_name, pack_id 
        FROM pack_collaborations 
        WHERE pack_id IS NULL OR pack_id = ''
    """)
    
    collaborations_to_fix = cursor.fetchall()
    print(f"Found {len(collaborations_to_fix)} collaborations to fix")
    
    for collab_id, pack_name, current_pack_id in collaborations_to_fix:
        print(f"Processing collaboration {collab_id}: pack_name='{pack_name}'")
        
        # Find the pack by name
        cursor.execute("SELECT id FROM packs WHERE name = ?", (pack_name,))
        pack_result = cursor.fetchone()
        
        if pack_result:
            pack_id = pack_result[0]
            print(f"  Found pack_id {pack_id} for pack '{pack_name}'")
            
            # Update the collaboration with the correct pack_id
            cursor.execute(
                "UPDATE pack_collaborations SET pack_id = ? WHERE id = ?",
                (pack_id, collab_id)
            )
            print(f"  Updated collaboration {collab_id} with pack_id {pack_id}")
        else:
            print(f"  WARNING: No pack found for name '{pack_name}'")
    
    # Commit the changes
    conn.commit()
    
    # Verify the results
    cursor.execute("""
        SELECT pc.id, pc.pack_name, pc.pack_id, p.name as pack_name_from_packs
        FROM pack_collaborations pc
        LEFT JOIN packs p ON pc.pack_id = p.id
        ORDER BY pc.id
    """)
    
    results = cursor.fetchall()
    print("\nVerification results:")
    for row in results:
        collab_id, pack_name, pack_id, pack_name_from_packs = row
        print(f"  Collaboration {collab_id}: pack_name='{pack_name}', pack_id={pack_id}, pack_name_from_packs='{pack_name_from_packs}'")
    
    conn.close()
    print("\nMigration completed!")

if __name__ == "__main__":
    fix_pack_collaborations() 