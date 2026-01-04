"""
Artist service - handles artist image management and operations.
"""

import re
import time
from typing import Optional, List
from sqlalchemy.orm import Session

from ..repositories.spotify_repository import SpotifyRepository
from ..validators.spotify_validators import (
    ArtistImageFetchResponse, BulkImageFetchResponse
)


class ArtistService:
    def __init__(self):
        self.repository = SpotifyRepository()

    def fetch_artist_image(self, artist_id: int, db: Session) -> ArtistImageFetchResponse:
        """Fetch artist image from Spotify for a specific artist."""
        artist = self.repository.get_artist_by_id(db, artist_id)
        if not artist:
            raise Exception("Artist not found")
        
        sp = self.repository.get_spotify_client()
        if not sp:
            raise Exception("Spotify credentials not configured")
        
        try:
            image_url = self.fetch_artist_image_from_spotify(artist.name, sp)
            if image_url:
                self.repository.update_artist_image(db, artist, image_url)
                return ArtistImageFetchResponse(
                    message=f"Artist image fetched successfully for {artist.name}",
                    image_url=artist.image_url
                )
            else:
                raise Exception("No artist image found on Spotify")
                
        except Exception as e:
            raise Exception(f"Failed to fetch artist image: {str(e)}")

    def fetch_all_missing_artist_images(self, db: Session) -> BulkImageFetchResponse:
        """Fetch artist images for all artists that don't have them."""
        sp = self.repository.get_spotify_client()
        if not sp:
            raise Exception("Spotify credentials not configured")
        
        log_entries = []
        max_log_entries = 200
        
        # Step 1: Create missing artist entries
        missing_artists = self.repository.get_songs_with_missing_artists(db)
        created_count = 0
        
        if missing_artists:
            log_entries.append(f"📋 Found {len(missing_artists)} artists in songs table without artist entries")
            
            for artist_name in missing_artists:
                if not self.repository.artist_exists_case_insensitive(db, artist_name):
                    try:
                        new_artist = self.repository.create_artist(db, artist_name)
                        if new_artist:
                            created_count += 1
                            if len(log_entries) < max_log_entries:
                                log_entries.append(f"➕ Created artist entry: {artist_name}")
                    except Exception as e:
                        if len(log_entries) < max_log_entries:
                            log_entries.append(f"❌ Failed to create artist {artist_name}: {e}")
                        continue
            
            if created_count > 0:
                db.commit()
                log_entries.append(f"✅ Created {created_count} missing artist entries")
        
        # Step 2: Get all artists without images
        artists_without_images = self.repository.get_artists_without_images(db)
        
        if not artists_without_images:
            return BulkImageFetchResponse(
                message="All artists already have images",
                updated_count=0,
                total_artists=0,
                created_count=created_count,
                log=log_entries
            )
        
        updated_count = 0
        total_count = len(artists_without_images)
        failed_artists = []
        
        log_entries.append(f"🖼️ Starting to fetch images for {total_count} artists...")
        
        # Process in batches
        commit_interval = 25
        
        for i, artist in enumerate(artists_without_images):
            try:
                image_url = self.fetch_artist_image_from_spotify(artist.name, sp)
                if image_url:
                    artist.image_url = image_url
                    updated_count += 1
                    entry = f"✅ {artist.name} – image fetched"
                else:
                    failed_artists.append(artist.name)
                    entry = f"⚠️ {artist.name} – no image found"
                if len(log_entries) < max_log_entries:
                    log_entries.append(entry)
                
                # Commit periodically
                if (i + 1) % commit_interval == 0:
                    db.commit()
                    print(f"Progress: {i + 1}/{total_count} artists processed, {updated_count} images fetched")
                
                # Rate limiting delay
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Failed to fetch image for {artist.name}: {e}")
                if len(log_entries) < max_log_entries:
                    log_entries.append(f"❌ {artist.name} – error: {e}")
                continue
        
        # Final commit
        db.commit()
        
        return BulkImageFetchResponse(
            message=f"Created {created_count} missing artists. Updated artist images for {updated_count} out of {total_count} artists",
            updated_count=updated_count,
            total_artists=total_count,
            created_count=created_count,
            failed_artists=failed_artists[:25],
            failed_count=len(failed_artists),
            log=log_entries
        )

    def fetch_artist_image_by_spotify_id(self, spotify_artist_id: str, sp=None) -> Optional[str]:
        """Fetch artist image directly using Spotify artist ID - guaranteed correct artist."""
        if not sp:
            sp = self.repository.get_spotify_client()
        if not sp:
            return None
        
        try:
            artist_data = sp.artist(spotify_artist_id)
            if artist_data:
                images = artist_data.get("images") or []
                if images:
                    return images[0].get("url")
        except Exception as e:
            print(f"Failed to fetch artist by ID {spotify_artist_id}: {e}")
        
        return None

    def fetch_artist_image_from_spotify(self, artist_name: str, sp=None, spotify_artist_id: Optional[str] = None) -> Optional[str]:
        """Helper function to fetch artist image from Spotify.
        
        If spotify_artist_id is provided, uses it directly (most accurate).
        Otherwise falls back to searching by artist name.
        """
        if not sp:
            sp = self.repository.get_spotify_client()
        if not sp:
            return None
        
        # If we have the Spotify artist ID, use it directly - this is most accurate
        if spotify_artist_id:
            image_url = self.fetch_artist_image_by_spotify_id(spotify_artist_id, sp)
            if image_url:
                return image_url
            # Fall through to name search if ID lookup fails
        
        # Fallback: search by artist name (less accurate for common names)
        queries = self._generate_artist_search_queries(artist_name)
        for query in queries:
            try:
                search = sp.search(q=query, type="artist", limit=3)
                items = (search.get("artists") or {}).get("items") or []
                for artist in items:
                    images = artist.get("images") or []
                    if images:
                        return images[0].get("url")
            except Exception as e:
                print(f"Spotify search failed for query '{query}': {e}")
                continue
        
        return None

    def _generate_artist_search_queries(self, artist_name: str) -> List[str]:
        """Generate multiple search queries for a given artist name."""
        queries = []
        cleaned = (artist_name or "").strip()
        if not cleaned:
            return queries
        
        def add_query(q: str):
            if q and q not in queries:
                queries.append(q)
        
        # Original name
        add_query(f'artist:"{cleaned}"')
        add_query(cleaned)
        
        # Remove content within parentheses
        no_paren = re.sub(r"\s*\(.*?\)\s*", " ", cleaned).strip()
        add_query(f'artist:"{no_paren}"')
        
        # Remove featuring/ft/feat/& sections
        no_feat = re.split(r"\bfeat\.|\bft\.|&|,|\bfeaturing\b", no_paren, maxsplit=1)[0].strip()
        add_query(f'artist:"{no_feat}"')
        add_query(no_feat)
        
        # Replace multiple spaces with single space
        normalized = re.sub(r"\s+", " ", no_feat)
        add_query(f'artist:"{normalized}"')
        
        return [q for q in queries if q]