#!/usr/bin/env python3
"""
Seed script to populate the achievements table with all available achievements.
Run this once to initialize the achievements in the database.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from models import Achievement, Base
from sqlalchemy import text

# Achievement definitions with code, name, description, icon, category, points, rarity, target_value, metric_type
ACHIEVEMENTS = [
    # Future Plans Songs (Planning/Vision)
    ("dreamer", "Dreamer", "Add your first song to Future Plans", "💭", "milestone_future", 10, "common", 1, "total_future_created"),
    ("visionary", "Visionary", "Add 5 songs to Future Plans", "🔮", "milestone_future", 10, "common", 5, "total_future_created"),
    ("long_term_planner", "Long Term Planner", "Add 10 songs to Future Plans", "📋", "milestone_future", 25, "uncommon", 10, "total_future_created"),
    ("strategic_thinker", "Strategic Thinker", "Add 25 songs to Future Plans", "🗺️", "milestone_future", 25, "uncommon", 25, "total_future_created"),
    ("master_planner", "Master Planner", "Add 50 songs to Future Plans", "📊", "milestone_future", 50, "rare", 50, "total_future_created"),
    ("future_architect", "Future Architect", "Add 100 songs to Future Plans", "🏗️", "milestone_future", 100, "epic", 100, "total_future_created"),
    ("planning_legend", "Planning Legend", "Add 250 songs to Future Plans", "📐", "milestone_future", 100, "epic", 250, "total_future_created"),
    
    # WIP Songs (Work/Progress) - Now tracks lifetime WIP creations, not concurrent WIPs
    ("getting_started_wip", "Getting Started", "Start your first WIP song", "🎬", "milestone_wip", 10, "common", 1, "wip_creations"),
    ("hard_worker", "Hard Worker", "Start 5 WIP songs", "💪", "milestone_wip", 10, "common", 5, "wip_creations"),
    ("dedicated_creator", "Dedicated Creator", "Start 10 WIP songs", "🎨", "milestone_wip", 25, "uncommon", 10, "wip_creations"),
    ("busy_bee", "Busy Bee", "Start 25 WIP songs", "🐝", "milestone_wip", 25, "uncommon", 25, "wip_creations"),
    ("workhorse", "Workhorse", "Start 50 WIP songs", "🐴", "milestone_wip", 50, "rare", 50, "wip_creations"),
    
    # WIP Completions (Finishing Work)
    ("first_finish", "First Finish", "Complete your first WIP (move to Released)", "🎉", "milestone_wip", 10, "common", 1, "wip_completions"),
    ("finisher", "Finisher", "Complete 5 WIP songs", "✅", "milestone_wip", 10, "common", 5, "wip_completions"),
    ("wip_master", "WIP Master", "Complete 10 WIP songs", "🏁", "milestone_wip", 25, "uncommon", 10, "wip_completions"),
    ("finishing_touch", "Finishing Touch", "Complete 25 WIP songs", "✨", "milestone_wip", 50, "rare", 25, "wip_completions"),
    ("fireworks_master", "Fireworks Master", "Complete 50 WIP songs", "🎇", "milestone_wip", 100, "epic", 50, "wip_completions"),
    
    # Released Songs (Celebration)
    ("first_release", "First Release", "Release your first song", "✨", "milestone_released", 10, "common", 1, "total_released"),
    ("rising_star", "Rising Star", "Release 5 songs", "⭐", "milestone_released", 10, "common", 5, "total_released"),
    ("published_artist", "Published Artist", "Release 10 songs", "🌟", "milestone_released", 25, "uncommon", 10, "total_released"),
    ("pro_performer", "Pro Performer", "Release 25 songs", "💫", "milestone_released", 50, "rare", 25, "total_released"),
    ("chart_topper", "Chart Topper", "Release 50 songs", "🏆", "milestone_released", 50, "rare", 50, "total_released"),
    ("hall_of_fame", "Hall of Fame", "Release 100 songs", "🎖️", "milestone_released", 100, "epic", 100, "total_released"),
    ("legendary_status", "Legendary Status", "Release 250 songs", "👑", "milestone_released", 250, "legendary", 250, "total_released"),
    ("immortal_legend", "Immortal Legend", "Release 500 songs", "🏛️", "milestone_released", 500, "legendary", 500, "total_released"),
    
    # Packs
    ("pack_starter", "Pack Starter", "Create your first pack", "📦", "milestone_packs", 10, "common", 1, "total_packs"),
    ("pack_creator", "Pack Creator", "Create 3 packs", "📚", "milestone_packs", 25, "uncommon", 3, "total_packs"),
    ("pack_master", "Pack Master", "Create 5 packs", "📖", "milestone_packs", 25, "uncommon", 5, "total_packs"),
    ("pack_legend", "Pack Legend", "Create 10 packs", "📘", "milestone_packs", 50, "rare", 10, "total_packs"),
    ("pack_collector", "Pack Collector", "Create 20 packs", "📗", "milestone_packs", 100, "epic", 20, "total_packs"),
    
    # Merged into social category - removed duplicates
    
    # Spotify Integration
    ("first_spotify_import", "Spotify Explorer", "Import from Spotify for the first time", "🎧", "activity", 10, "common", 1, "total_spotify_imports"),
    ("five_spotify_imports", "Playlist Master", "Import 5 playlists from Spotify", "📋", "activity", 25, "uncommon", 5, "total_spotify_imports"),
    ("ten_spotify_imports", "Spotify Power User", "Import 10 playlists from Spotify", "🎵", "activity", 50, "rare", 10, "total_spotify_imports"),
    
    # Engagement
    ("three_day_streak", "Early Bird", "Log in 3 days in a row", "🌅", "activity", 10, "common", 3, "login_streak"),
    ("seven_day_streak", "Dedicated", "Log in 7 days in a row", "📅", "activity", 25, "uncommon", 7, "login_streak"),
    ("fourteen_day_streak", "Committed", "Log in 14 days in a row", "💪", "activity", 25, "uncommon", 14, "login_streak"),
    ("thirty_day_streak", "Loyal", "Log in 30 days in a row", "❤️", "activity", 50, "rare", 30, "login_streak"),
    ("sixty_day_streak", "Devoted", "Log in 60 days in a row", "🔥", "activity", 100, "epic", 60, "login_streak"),
    ("hundred_day_streak", "TrackFlow Veteran", "Log in 100 days in a row", "🏅", "activity", 250, "legendary", 100, "login_streak"),
    
    # Community Contribution
    ("first_feature_request", "Idea Generator", "Submit your first feature request", "💡", "activity", 10, "common", 1, "total_feature_requests"),
    ("five_feature_requests", "Innovator", "Submit 5 feature requests", "🚀", "activity", 25, "uncommon", 5, "total_feature_requests"),
    
    # Quality Achievements - Song Completion
    ("first_complete_song", "Perfectionist", "Complete all authoring fields for a song", "✨", "quality", 10, "common", 1, "completed_songs"),
    ("five_complete_songs", "Multi-Talented", "Complete 5 fully authored songs", "🎭", "quality", 25, "uncommon", 5, "completed_songs"),
    ("ten_complete_songs", "Master Craftsman", "Complete 10 fully authored songs", "🔨", "quality", 50, "rare", 10, "completed_songs"),
    ("twenty_five_complete_songs", "Artisan", "Complete 25 fully authored songs", "🎨", "quality", 100, "epic", 25, "completed_songs"),
    
    # Quality Achievements - Pack Completion
    ("first_complete_pack", "Pack Perfectionist", "Complete all songs in a pack (all fully authored)", "📦✨", "quality", 25, "uncommon", 1, "completed_packs"),
    ("three_complete_packs", "Pack Master", "Complete 3 packs fully", "📚🏆", "quality", 50, "rare", 3, "completed_packs"),
    ("five_complete_packs", "Pack Legend", "Complete 5 packs fully", "📖👑", "quality", 100, "epic", 5, "completed_packs"),
    
    # Album Series
    ("first_album_series", "Series Starter", "Create your first album series", "🎬", "quality", 10, "common", 1, "series_created"),
    ("first_complete_series", "Series Master", "Complete an album series", "🎯", "quality", 25, "uncommon", 1, "completed_series"),
    ("three_complete_series", "Series Collector", "Complete 3 album series", "📀", "quality", 50, "rare", 3, "completed_series"),
    ("five_complete_series", "Series Legend", "Complete 5 album series", "🎪", "quality", 100, "epic", 5, "completed_series"),
    
    # Social Achievements (Collaborations, sharing, and community interaction)
    ("first_collaboration_added", "Collaborative Spirit", "Be added as a collaborator or add someone as a collaborator", "🤝", "social", 10, "common", 1, "collaborations_total"),
    ("three_collaborations_social", "Team Player", "Be involved in 3 collaborations (added or adding)", "👥", "social", 25, "uncommon", 3, "collaborations_total"),
    ("five_collaborations_added", "Popular Collaborator", "Be involved in 5 collaborations (added or adding)", "⭐", "social", 25, "uncommon", 5, "collaborations_total"),
    ("ten_collaborations_added", "Social Butterfly", "Be involved in 10 collaborations (added or adding)", "🦋", "social", 50, "rare", 10, "collaborations_total"),
    ("twenty_five_collaborations_added", "Community Leader", "Be involved in 25 collaborations (added or adding)", "👑", "social", 100, "epic", 25, "collaborations_total"),
    
    # Diversity Achievements - Artist Diversity
    ("five_different_artists", "Variety Seeker", "Complete songs from 5 different artists", "🎭", "diversity", 25, "uncommon", 5, "unique_artists"),
    ("ten_different_artists", "Music Explorer", "Complete songs from 10 different artists", "🌍", "diversity", 50, "rare", 10, "unique_artists"),
    ("twenty_five_different_artists", "Artist Collector", "Complete songs from 25 different artists", "🎨", "diversity", 100, "epic", 25, "unique_artists"),
    ("fifty_different_artists", "Diversity Master", "Complete songs from 50 different artists", "🌈", "diversity", 100, "epic", 50, "unique_artists"),
    ("hundred_different_artists", "Universal Listener", "Complete songs from 100 different artists", "🎵", "diversity", 250, "legendary", 100, "unique_artists"),
    
    # Diversity Achievements - Year Diversity
    ("five_different_years", "Time Traveler", "Complete songs from 5 different years", "⏰", "diversity", 25, "uncommon", 5, "unique_years"),
    ("ten_different_years", "Decade Explorer", "Complete songs from 10 different years", "📅", "diversity", 50, "rare", 10, "unique_years"),
    ("twenty_five_different_years", "Era Collector", "Complete songs from 25 different years", "🕰️", "diversity", 100, "epic", 25, "unique_years"),
    ("fifty_different_years", "Timeline Master", "Complete songs from 50 different years", "📆", "diversity", 100, "epic", 50, "unique_years"),
    
    # Diversity Achievements - Decade Diversity
    ("two_different_decades", "Decade Dabbler", "Complete songs from 2 different decades", "🎸", "diversity", 25, "uncommon", 2, "unique_decades"),
    ("three_different_decades", "Multi-Decade", "Complete songs from 3 different decades", "🎹", "diversity", 50, "rare", 3, "unique_decades"),
    ("four_different_decades", "Decade Master", "Complete songs from 4 different decades", "🎺", "diversity", 100, "epic", 4, "unique_decades"),
    ("five_different_decades", "Timeline Legend", "Complete songs from 5 different decades", "🎻", "diversity", 250, "legendary", 5, "unique_decades"),
    
    # Diversity Achievements - Alphabet Diversity
    ("alphabet_collector", "Alphabet Collector", "Release songs starting with every letter A-Z", "🔤", "diversity", 250, "legendary", 26, "alphabet_coverage"),
    
    # Public Songs Achievements (Future Plans and WIP available for collaboration)
    ("first_public_wip", "Open Creator", "Make your first song public for collaboration", "🌐", "social", 10, "common", 1, "public_wips"),
    ("five_public_wips", "Community Sharer", "Have 5 songs public for collaboration", "📢", "social", 25, "uncommon", 5, "public_wips"),
    ("ten_public_wips", "Open Workshop", "Have 10 songs public for collaboration", "🏭", "social", 50, "rare", 10, "public_wips"),
    ("twenty_five_public_wips", "Transparent Creator", "Have 25 songs public for collaboration", "💎", "social", 100, "epic", 25, "public_wips"),
    
    # Collaboration Request Achievements
    ("first_collab_request", "Reach Out", "Make your first collaboration request", "🤲", "social", 10, "common", 1, "collab_requests_sent"),
    ("five_collab_requests", "Active Networker", "Make 5 collaboration requests", "🕸️", "social", 25, "uncommon", 5, "collab_requests_sent"),
    ("ten_collab_requests", "Collaboration Seeker", "Make 10 collaboration requests", "🔍", "social", 50, "rare", 10, "collab_requests_sent"),
    
    # Activity Achievements
    ("welcome_aboard", "Welcome Aboard!", "Successfully create your TrackFlow account and join the community", "👋", "activity", 5, "common", None, None),
]

def seed_achievements():
    """Seed the achievements table with all achievement definitions."""
    db = SessionLocal()
    try:
        # Check if achievements already exist
        existing_count = db.query(Achievement).count()
        if existing_count > 0:
            print(f"⚠️  Achievements table already has {existing_count} entries.")
            print("Continuing to add missing achievements...")
        
        added_count = 0
        skipped_count = 0
        
        for achievement_data in ACHIEVEMENTS:
            if len(achievement_data) == 7:
                # Old format without target_value and metric_type
                code, name, description, icon, category, points, rarity = achievement_data
                target_value = None
                metric_type = None
            elif len(achievement_data) == 9:
                # New format with target_value and metric_type
                code, name, description, icon, category, points, rarity, target_value, metric_type = achievement_data
            else:
                print(f"⚠️ Invalid achievement data format: {achievement_data}")
                continue
                
            # Check if achievement already exists
            existing = db.query(Achievement).filter(Achievement.code == code).first()
            if existing:
                updated = False
                # Update existing achievement with new fields if they're missing or incorrect
                if existing.target_value is None and target_value is not None:
                    existing.target_value = target_value
                    existing.metric_type = metric_type
                    updated = True
                    print(f"🔄 Updated {code} with target data")
                
                # Fix Welcome Aboard achievement if it has wrong category or points
                if code == "welcome_aboard":
                    if existing.category != category:
                        print(f"🔄 Fixing {code}: category '{existing.category}' → '{category}'")
                        existing.category = category
                        updated = True
                    if existing.points != points:
                        print(f"🔄 Fixing {code}: points {existing.points} → {points}")
                        existing.points = points
                        updated = True
                
                if not updated:
                    print(f"⏭️  Skipping {code} (already exists)")
                    skipped_count += 1
                continue
            
            achievement = Achievement(
                code=code,
                name=name,
                description=description,
                icon=icon,
                category=category,
                points=points,
                rarity=rarity,
                target_value=target_value,
                metric_type=metric_type
            )
            db.add(achievement)
            added_count += 1
            print(f"✅ Added: {name} ({code})")
        
        db.commit()
        print(f"\n✅ Successfully seeded {added_count} achievements")
        if skipped_count > 0:
            print(f"⏭️  Skipped {skipped_count} existing achievements")
        print(f"📊 Total achievements in database: {db.query(Achievement).count()}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding achievements: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Seeding achievements...")
    seed_achievements()
    print("✨ Done!")

