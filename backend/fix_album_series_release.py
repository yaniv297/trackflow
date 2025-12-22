"""Script to retroactively fix album series releases that are missing series numbers."""

from database import get_db
from models import AlbumSeries
from api.album_series.services.album_series_service import AlbumSeriesService


def fix_album_series(album_name: str = None, artist_name: str = None, pack_id: int = None, pack_name: str = None):
    """
    Fix an album series that was released but is missing a series number.
    
    Args:
        album_name: Name of the album to fix (e.g., "Reading Writing And Arithmetic")
        artist_name: Optional artist name to narrow down the search
        pack_id: Optional pack ID to find the series
        pack_name: Optional pack name to find the associated pack
    """
    db = next(get_db())
    
    try:
        from models import Pack, Song
        
        # If pack_name is provided, find the pack first
        if pack_name:
            pack = db.query(Pack).filter(Pack.name.ilike(f"%{pack_name}%")).first()
            if pack:
                print(f"✅ Found pack: {pack.name} (ID: {pack.id})")
                print(f"   Pack Status: {pack.status if hasattr(pack, 'status') else 'N/A'}")
                print(f"   Released At: {pack.released_at}")
                pack_id = pack.id
            else:
                print(f"⚠️ Pack not found: {pack_name}")
        
        # Find the album series
        query = db.query(AlbumSeries)
        
        if pack_id:
            query = query.filter(AlbumSeries.pack_id == pack_id)
        elif album_name:
            query = query.filter(AlbumSeries.album_name.ilike(f"%{album_name}%"))
            if artist_name:
                query = query.filter(AlbumSeries.artist_name.ilike(f"%{artist_name}%"))
        else:
            print("Error: Must provide either album_name, pack_id, or pack_name")
            return
        
        album_series = query.first()
        
        if not album_series:
            print(f"❌ Album series not found for: {album_name or f'pack_id={pack_id}'}")
            return
        
        print(f"\n✅ Found album series:")
        print(f"   ID: {album_series.id}")
        print(f"   Album: {album_series.album_name}")
        print(f"   Artist: {album_series.artist_name}")
        print(f"   Pack ID: {album_series.pack_id}")
        print(f"   Current Status: {album_series.status}")
        print(f"   Current Series Number: {album_series.series_number}")
        
        # Check if there's a released pack associated with songs in this series
        songs_in_series = db.query(Song).filter(Song.album_series_id == album_series.id).all()
        if songs_in_series:
            released_songs = [s for s in songs_in_series if s.status == "Released"]
            packs_in_series = set([s.pack_id for s in songs_in_series if s.pack_id])
            released_packs = []
            for pid in packs_in_series:
                if pid:
                    pack = db.query(Pack).filter(Pack.id == pid).first()
                    if pack and pack.released_at:
                        released_packs.append(pack)
            
            print(f"\n📊 Series Analysis:")
            print(f"   Total songs in series: {len(songs_in_series)}")
            print(f"   Released songs: {len(released_songs)}")
            print(f"   Packs with released songs: {len(released_packs)}")
            
            if released_packs:
                print(f"\n   Released packs:")
                for pack in released_packs:
                    print(f"      - {pack.name} (ID: {pack.id}, released: {pack.released_at})")
        
        # Check if it needs fixing
        if album_series.status == "released" and album_series.series_number is None:
            print(f"\n🔧 Fixing: Assigning series number...")
            
            # Use the AlbumSeriesService to properly assign the series number
            service = AlbumSeriesService(db)
            next_series_number = service.album_series_repo.get_next_series_number()
            album_series.series_number = next_series_number
            db.commit()
            db.refresh(album_series)
            print(f"✅ Assigned series number: #{next_series_number}")
            
            # Refresh and show final state
            db.refresh(album_series)
            print(f"\n✅ Fixed! Final state:")
            print(f"   Status: {album_series.status}")
            print(f"   Series Number: #{album_series.series_number}")
            
        elif album_series.series_number is not None:
            print(f"\nℹ️ Album series already has series number #{album_series.series_number}")
            
            # Link to pack if missing
            if not album_series.pack_id and released_packs:
                primary_pack = released_packs[0]
                print(f"🔗 Linking album series to pack: {primary_pack.name} (ID: {primary_pack.id})")
                album_series.pack_id = primary_pack.id
                db.commit()
                db.refresh(album_series)
            
            if album_series.status != "released":
                print(f"⚠️ Status is '{album_series.status}' but has series number. Updating status to 'released'...")
                album_series.status = "released"
                db.commit()
                print(f"✅ Status updated to 'released'")
            
            print(f"\n✅ Final state:")
            print(f"   Status: {album_series.status}")
            print(f"   Series Number: #{album_series.series_number}")
            print(f"   Pack ID: {album_series.pack_id}")
        else:
            # Check if we should release it (if pack is released or songs are released)
            should_release = False
            if pack_id:
                pack = db.query(Pack).filter(Pack.id == pack_id).first()
                if pack and pack.released_at:
                    should_release = True
                    print(f"\n🔧 Pack is released, releasing album series...")
            elif released_packs:
                should_release = True
                print(f"\n🔧 Found released packs with songs in this series, releasing album series...")
            
            if should_release:
                service = AlbumSeriesService(db)
                
                # If we found a released pack but album series doesn't have pack_id, link them
                if not album_series.pack_id and released_packs:
                    primary_pack = released_packs[0]  # Use the first released pack
                    print(f"\n🔗 Linking album series to pack: {primary_pack.name} (ID: {primary_pack.id})")
                    album_series.pack_id = primary_pack.id
                    db.commit()
                
                result = service.release_series(album_series.id)
                print(f"✅ Released album series: {result.get('message', 'Success')}")
                db.refresh(album_series)
                print(f"\n✅ Fixed! Final state:")
                print(f"   Status: {album_series.status}")
                print(f"   Series Number: #{album_series.series_number}")
                print(f"   Pack ID: {album_series.pack_id}")
            else:
                print(f"\nℹ️ Album series status is '{album_series.status}' (not released yet)")
                print(f"   To release it, use the release workflow or call release_series()")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    # Default to "Reading Writing And Arithmetic" if no args provided
    if len(sys.argv) > 1:
        album_name = sys.argv[1]
        artist_name = sys.argv[2] if len(sys.argv) > 2 else None
        pack_id = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else None
    else:
        # Fix "Reading Writing And Arithmetic"
        album_name = "Reading Writing And Arithmetic"
        artist_name = None
        pack_id = None
    
    print(f"🔍 Searching for album series: {album_name}")
    if artist_name:
        print(f"   Artist: {artist_name}")
    if pack_id:
        print(f"   Pack ID: {pack_id}")
    print()
    
    fix_album_series(album_name=album_name, artist_name=artist_name, pack_id=pack_id)

