#!/usr/bin/env python3
"""
Migration script to add indie songs from the 21st century and Pavement songs.
This script creates users, songs, and collaborations as specified.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Pack, Song, Collaboration, CollaborationType, SongStatus
from datetime import datetime

def create_user_if_not_exists(db: Session, username: str) -> User:
    """Create a user if they don't exist, return the user object"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        print(f"Creating user: {username}")
        # Create a dummy email and password for migration users
        email = f"{username.lower()}@migration.local"
        # Create a simple hashed password (not secure, just for migration)
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash("migration123")
        
        user = User(username=username, email=email, hashed_password=hashed_password)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        print(f"User already exists: {username}")
    return user

def get_pack_by_id(db: Session, pack_id: int) -> Pack:
    """Get a pack by ID"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise ValueError(f"Pack with ID {pack_id} not found")
    return pack

def create_or_update_song(db: Session, title: str, artist: str, owner: User, pack: Pack, collaborators: list = None) -> Song:
    """Create a song or update existing song with the specified owner and pack"""
    # Check if song already exists
    existing_song = db.query(Song).filter(Song.title == title, Song.artist == artist).first()
    
    if existing_song:
        print(f"Updating existing song: {artist} - {title} (owner: {owner.username}, pack: {pack.name})")
        # Update ownership and pack
        existing_song.user_id = owner.id
        existing_song.pack_id = pack.id
        existing_song.status = SongStatus.released
        db.commit()
        db.refresh(existing_song)
        song = existing_song
    else:
        print(f"Creating new song: {artist} - {title} (owner: {owner.username}, pack: {pack.name})")
        song = Song(
            title=title,
            artist=artist,
            status=SongStatus.released,
            user_id=owner.id,
            pack_id=pack.id,
            year=2024  # Default year for these songs
        )
        db.add(song)
        db.commit()
        db.refresh(song)
    
    # Remove existing collaborations for this song
    db.query(Collaboration).filter(Collaboration.song_id == song.id).delete()
    
    # Add collaborations if specified
    if collaborators:
        for collab_username in collaborators:
            collab_user = create_user_if_not_exists(db, collab_username)
            collaboration = Collaboration(
                song_id=song.id,
                user_id=collab_user.id,
                collaboration_type=CollaborationType.SONG_EDIT
            )
            db.add(collaboration)
            print(f"  Added collaboration: {collab_username}")
    
    db.commit()
    
    # Auto-enhance with Spotify and clean remaster tags
    try:
        from api.spotify import auto_enhance_song
        if auto_enhance_song(song.id, db):
            print(f"  ✅ Enhanced with Spotify data")
            
            # Auto-clean remaster tags after enhancement
            try:
                from api.tools import clean_string
                db.refresh(song)  # Refresh to get updated data from Spotify
                
                cleaned_title = clean_string(song.title)
                cleaned_album = clean_string(song.album or "")
                
                if cleaned_title != song.title or cleaned_album != song.album:
                    print(f"  ✅ Cleaned remaster tags")
                    song.title = cleaned_title
                    song.album = cleaned_album
                    db.commit()
            except Exception as clean_error:
                print(f"  ⚠️ Failed to clean remaster tags: {clean_error}")
        else:
            print(f"  ⚠️ No Spotify enhancement available")
    except Exception as e:
        print(f"  ⚠️ Failed to enhance with Spotify: {e}")
    
    return song

def migrate_indie_songs():
    """Migrate all the indie songs from the 21st century"""
    db = SessionLocal()
    
    try:
        print("=== Starting Indie Songs Migration ===")
        
        # Use existing pack
        indie_pack = get_pack_by_id(db, 4)  # "AIRHeads present: Indie of the 21st Century"
        print(f"Using existing pack: {indie_pack.name} (ID: {indie_pack.id})")
        
        # Songs owned by Kamotch
        kamotch = create_user_if_not_exists(db, "Kamotch")
        kamotch_songs = [
            ("Parallel or Together", "Ted Leo and the Pharmacists"),
            ("Pool Party", "The Aquabats"),
            ("Day Of The Deadringers", "Mclusky"),
            ("Experimental Film", "They Might Be Giants"),
            ("Skeleton", "Bloc Party"),
            ("Tranquilize", "The Killers"),
            ("Be Safe", "The Cribs", ["jphn"]),
            ("Claustrophobe", "Laura Stevenson"),
            ("Hearts in Motion", "Yuck"),
            ("Kids", "PUP"),
            ("This Life", "Vampire Weekend"),
            ("Bluish", "Chris Farren"),
            ("The Beauty Of Breathing", "Jeff Rosenstock"),
        ]
        
        for song_data in kamotch_songs:
            if len(song_data) == 2:
                title, artist = song_data
                collaborators = None
            else:
                title, artist, collaborators = song_data
            create_or_update_song(db, title, artist, kamotch, indie_pack, collaborators)
        
        # Songs owned by Bat Ramps
        bat_ramps = create_user_if_not_exists(db, "Bat Ramps")
        bat_ramps_songs = [
            ("Karen Revisited", "Sonic Youth"),
            ("Us Or Them", "The Cure"),
            ("Ever (Foreign Flag)", "Team Sleep"),
            ("Don't Call Me Whitney, Bobby", "Islands"),
            ("Dream Blue Haze", "Adventures"),
        ]
        
        for title, artist in bat_ramps_songs:
            create_or_update_song(db, title, artist, bat_ramps, indie_pack)
        
        # Songs owned by BornGamerRob
        borngamerrob = create_user_if_not_exists(db, "BornGamerRob")
        borngamerrob_songs = [
            ("Precious", "Depeche Mode"),
            ("In The Morning", "Razorlight"),
            ("Bad Day", "Darwin Deez"),
            ("Weeds", "Beach Bunny"),
            ("Paradise", "Briston Maroney"),
            ("WORTHLESS", "d4vd"),
            ("as if", "glaive"),
        ]
        
        for title, artist in borngamerrob_songs:
            create_or_update_song(db, title, artist, borngamerrob, indie_pack)
        
        # Songs owned by TheOreo
        theoreo = create_user_if_not_exists(db, "TheOreo")
        theoreo_songs = [
            ("Michael", "Franz Ferdinand"),
            ("Black Fingernails, Red Wine", "Eskimo Joe"),
            ("Meds", "Placebo"),
            ("Golden Skans", "Klaxons", ["EdTanguy"]),
            ("Parlez-Vous Francais?", "Art vs Science"),
            ("Heart Skipped A Beat", "The xx"),
            ("Rimbaud Eyes", "Dum Dum Girls"),
            ("Amsterdam", "Nothing But Thieves"),
            ("Great Mass of Color", "Deafheaven"),
            ("Wake Me Up", "Foals"),
            ("I Don't Want To Go To Mars", "White Lies"),
        ]
        
        for song_data in theoreo_songs:
            if len(song_data) == 2:
                title, artist = song_data
                collaborators = None
            else:
                title, artist, collaborators = song_data
            create_or_update_song(db, title, artist, theoreo, indie_pack, collaborators)
        
        # Songs owned by dTanguy
        dtanguy = create_user_if_not_exists(db, "dTanguy")
        dtanguy_songs = [
            ("Havana Gang Brawl", "The Zutons"),
            ("Modern Way", "Kaiser Chiefs"),
            ("This Is An Emergency", "The Pigeon Detectives"),
        ]
        
        for title, artist in dtanguy_songs:
            create_or_update_song(db, title, artist, dtanguy, indie_pack)
        
        # Handle existing songs that need owner changes
        print("\n=== Updating Existing Songs ===")
        
        # Viagra Boys - Punk Rock Loser
        viagra_song = db.query(Song).filter(Song.title == "Punk Rock Loser", Song.artist == "Viagra Boys").first()
        if viagra_song:
            print(f"Updating owner for: Viagra Boys - Punk Rock Loser")
            viagra_song.user_id = theoreo.id
            viagra_song.pack_id = indie_pack.id
            
            # Add collaboration
            yaniv297 = create_user_if_not_exists(db, "yaniv297")
            collaboration = Collaboration(
                song_id=viagra_song.id,
                user_id=yaniv297.id,
                collaboration_type=CollaborationType.SONG_EDIT
            )
            db.add(collaboration)
            print(f"  Added collaboration: yaniv297")
        else:
            print("Warning: Viagra Boys - Punk Rock Loser not found")
        
        # Fontaines D.C. - I Love You
        fontaines_song = db.query(Song).filter(Song.title == "I Love You", Song.artist == "Fontaines D.C.").first()
        if fontaines_song:
            print(f"Updating owner for: Fontaines D.C. - I Love You")
            fontaines_song.user_id = theoreo.id
            fontaines_song.pack_id = indie_pack.id
            
            # Add collaborations
            yaniv297 = create_user_if_not_exists(db, "yaniv297")
            jphn = create_user_if_not_exists(db, "jphn")
            
            for collab_user in [yaniv297, jphn]:
                collaboration = Collaboration(
                    song_id=fontaines_song.id,
                    user_id=collab_user.id,
                    collaboration_type=CollaborationType.SONG_EDIT
                )
                db.add(collaboration)
                print(f"  Added collaboration: {collab_user.username}")
        else:
            print("Warning: Fontaines D.C. - I Love You not found")
        
        db.commit()
        print("\n=== Indie Songs Migration Complete ===")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def migrate_pavement_songs():
    """Migrate all the Pavement songs"""
    db = SessionLocal()
    
    try:
        print("\n=== Starting Pavement Songs Migration ===")
        
        # Use existing pack
        pavement_pack = get_pack_by_id(db, 78)  # "Pavement: Rock Band"
        print(f"Using existing pack: {pavement_pack.name} (ID: {pavement_pack.id})")
        
        # Songs owned by jphn
        jphn = create_user_if_not_exists(db, "jphn")
        jphn_songs = [
            ("Angel Carver Blues/Mellow Jazz Docent", "Pavement"),
            ("Chesley's Little Wrists", "Pavement", ["yaniv297"]),
            ("Jackals, False Grails: The Lonesome Era", "Pavement", ["Kamotch"]),
            ("Best Friends Arm", "Pavement"),
            ("Flux = Rad", "Pavement"),
        ]
        
        for song_data in jphn_songs:
            if len(song_data) == 2:
                title, artist = song_data
                collaborators = None
            else:
                title, artist, collaborators = song_data
            create_or_update_song(db, title, artist, jphn, pavement_pack, collaborators)
        
        # Songs owned by kamotch
        kamotch = create_user_if_not_exists(db, "Kamotch")
        kamotch_songs = [
            ("Debris Slide", "Pavement"),
            ("Baptist Blacktick", "Pavement"),
            ("Sue Me Jack", "Pavement"),
            ("Lions (Linden)", "Pavement"),
            ("Coolin' By Sound", "Pavement"),
            ("All My Friends", "Pavement", ["jphn"]),
            ("The Sutcliffe Catering Song", "Pavement"),
            ("Date w/ IKEA", "Pavement"),
            ("Carrot Rope", "Pavement"),
        ]
        
        for song_data in kamotch_songs:
            if len(song_data) == 2:
                title, artist = song_data
                collaborators = None
            else:
                title, artist, collaborators = song_data
            create_or_update_song(db, title, artist, kamotch, pavement_pack, collaborators)
        
        db.commit()
        print("\n=== Pavement Songs Migration Complete ===")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting song migration...")
    migrate_indie_songs()
    migrate_pavement_songs()
    print("\n🎉 Migration completed successfully!") 