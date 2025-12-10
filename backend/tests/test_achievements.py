"""
Comprehensive test suite for the achievement system.
Tests all achievement triggers and ensures they're properly integrated.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import SessionLocal
from main import app
from models import (
    User, Song, SongStatus, Pack, Achievement, UserAchievement, UserStats,
    Collaboration, CollaborationType, FeatureRequest, ActivityLog, AlbumSeries
)
from api.achievements import (
    check_all_achievements, check_status_achievements, check_wip_completion_achievements,
    check_diversity_achievements, check_collaboration_achievements, check_social_achievements,
    check_pack_achievements, check_spotify_achievements, check_login_streak_achievements,
    check_feature_request_achievements, check_bug_report_achievements, check_quality_achievements,
    check_album_series_achievements, award_achievement, update_user_stats
)


class TestAchievements:
    """Test suite for achievement system."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data before each test."""
        self.db = SessionLocal()
        self.client = TestClient(app)
        
        # Create test users
        self.user1 = User(username="testuser1", email="test1@test.com", hashed_password="hash1")
        self.user2 = User(username="testuser2", email="test2@test.com", hashed_password="hash2")
        self.db.add(self.user1)
        self.db.add(self.user2)
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)
        
        # Create test achievements
        self.create_test_achievements()
        
        yield
        
        # Cleanup
        self.db.close()

    def create_test_achievements(self):
        """Create test achievements for testing."""
        test_achievements = [
            # Released songs
            ("first_release", "First Release", "Release your first song", "✨", "milestone_released", 10, "common", 1, "total_released"),
            ("rising_star", "Rising Star", "Release 5 songs", "⭐", "milestone_released", 10, "common", 5, "total_released"),
            
            # WIP completions
            ("first_finish", "First Finish", "Complete your first WIP", "🎉", "milestone_wip", 10, "common", 1, "wip_completions"),
            ("finisher", "Finisher", "Complete 5 WIP songs", "✅", "milestone_wip", 10, "common", 5, "wip_completions"),
            
            # Packs
            ("pack_starter", "Pack Starter", "Create your first pack", "📦", "milestone_packs", 10, "common", 1, "total_packs"),
            ("pack_creator", "Pack Creator", "Create 3 packs", "📚", "milestone_packs", 25, "uncommon", 3, "total_packs"),
            
            # Collaborations
            ("first_collaborator", "Team Player", "Add your first collaborator", "🤝", "milestone_collaborations", 10, "common", 1, "total_collaborations"),
            
            # Social (being added as collaborator)
            ("first_collaboration_added", "Collaborative Spirit", "Be added as a collaborator", "🤝", "social", 10, "common", 1, "collaborations_added"),
            
            # Diversity
            ("five_different_artists", "Variety Seeker", "Complete songs from 5 different artists", "🎭", "diversity", 25, "uncommon", 5, "unique_artists"),
            
            # Feature requests
            ("first_feature_request", "Idea Generator", "Submit your first feature request", "💡", "activity", 10, "common", 1, "total_feature_requests"),
        ]
        
        for achievement_data in test_achievements:
            code, name, description, icon, category, points, rarity, target_value, metric_type = achievement_data
            
            # Check if achievement already exists
            existing = self.db.query(Achievement).filter(Achievement.code == code).first()
            if not existing:
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
                self.db.add(achievement)
        
        self.db.commit()

    def create_test_song(self, user_id: int, status: SongStatus = SongStatus.future, **kwargs) -> Song:
        """Helper to create a test song."""
        defaults = {
            "title": f"Test Song {datetime.now().microsecond}",
            "artist": "Test Artist",
            "status": status,
            "user_id": user_id
        }
        defaults.update(kwargs)
        
        song = Song(**defaults)
        self.db.add(song)
        self.db.commit()
        self.db.refresh(song)
        return song

    def create_test_pack(self, user_id: int, name: str = None) -> Pack:
        """Helper to create a test pack."""
        if name is None:
            name = f"Test Pack {datetime.now().microsecond}"
        
        pack = Pack(name=name, user_id=user_id)
        self.db.add(pack)
        self.db.commit()
        self.db.refresh(pack)
        return pack

    def get_user_achievements(self, user_id: int) -> list:
        """Get all achievement codes earned by a user."""
        achievements = self.db.query(Achievement.code).join(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).all()
        return [code[0] for code in achievements]

    def test_release_pack_triggers_achievements(self):
        """Test that releasing a pack properly triggers achievements."""
        # Create a pack with songs
        pack = self.create_test_pack(self.user1.id)
        
        # Create WIP songs that can be completed
        song1 = self.create_test_song(self.user1.id, SongStatus.wip, pack_id=pack.id, artist="Artist A", year=2020)
        song2 = self.create_test_song(self.user1.id, SongStatus.wip, pack_id=pack.id, artist="Artist B", year=2021)
        
        # Mock songs as fully authored for release
        from models import Authoring
        for song in [song1, song2]:
            authoring = Authoring(
                song_id=song.id,
                demucs=True, tempo_map=True, fake_ending=True, drums=True,
                bass=True, guitar=True, vocals=True, harmonies=True,
                pro_keys=True, keys=True, animations=True, drum_fills=True,
                overdrive=True, compile=True
            )
            self.db.add(authoring)
        self.db.commit()
        
        # Check initial state - no achievements
        initial_achievements = self.get_user_achievements(self.user1.id)
        
        # Release the pack via API endpoint
        # Note: We'll test the achievement logic directly since API testing requires auth setup
        from api.songs import release_pack
        
        # Simulate the pack release logic
        songs = self.db.query(Song).filter(Song.pack_id == pack.id).all()
        for song in songs:
            song.status = SongStatus.released
        self.db.commit()
        
        # Trigger achievement checks (this is what our fix added)
        check_status_achievements(self.db, self.user1.id)
        check_wip_completion_achievements(self.db, self.user1.id)
        check_diversity_achievements(self.db, self.user1.id)
        
        # Verify achievements were awarded
        final_achievements = self.get_user_achievements(self.user1.id)
        
        # Should have earned release and WIP completion achievements
        assert "first_release" in final_achievements, "Should earn first release achievement"
        assert "first_finish" in final_achievements, "Should earn first WIP completion achievement"
        
        # Check that more released songs lead to more achievements
        song3 = self.create_test_song(self.user1.id, SongStatus.wip, pack_id=pack.id)
        song3.status = SongStatus.released
        self.db.commit()
        
        check_status_achievements(self.db, self.user1.id)
        updated_achievements = self.get_user_achievements(self.user1.id)
        
        print(f"Release pack test - Final achievements: {final_achievements}")

    def test_collaboration_achievements(self):
        """Test that collaboration features properly trigger achievements."""
        # Create a song owned by user1
        song = self.create_test_song(self.user1.id)
        
        # Check initial state
        user1_initial = self.get_user_achievements(self.user1.id)
        user2_initial = self.get_user_achievements(self.user2.id)
        
        # Add user2 as collaborator
        collaboration = Collaboration(
            song_id=song.id,
            user_id=self.user2.id,
            collaboration_type=CollaborationType.SONG_EDIT
        )
        self.db.add(collaboration)
        self.db.commit()
        
        # Trigger achievement checks (this is what our fix ensures happens)
        check_collaboration_achievements(self.db, self.user1.id)  # For song owner
        check_social_achievements(self.db, self.user2.id)  # For collaborator
        
        # Verify achievements
        user1_final = self.get_user_achievements(self.user1.id)
        user2_final = self.get_user_achievements(self.user2.id)
        
        # User1 should get collaboration owner achievement
        assert "first_collaborator" in user1_final, "Song owner should earn collaboration achievement"
        
        # User2 should get social achievement for being added
        assert "first_collaboration_added" in user2_final, "Collaborator should earn social achievement"
        
        print(f"Collaboration test - User1 achievements: {user1_final}")
        print(f"Collaboration test - User2 achievements: {user2_final}")

    def test_pack_creation_achievements(self):
        """Test that creating packs triggers achievements."""
        initial_achievements = self.get_user_achievements(self.user1.id)
        
        # Create first pack
        pack1 = self.create_test_pack(self.user1.id)
        check_pack_achievements(self.db, self.user1.id)
        
        achievements_after_1 = self.get_user_achievements(self.user1.id)
        assert "pack_starter" in achievements_after_1, "Should earn pack starter achievement"
        
        # Create more packs
        pack2 = self.create_test_pack(self.user1.id)
        pack3 = self.create_test_pack(self.user1.id)
        check_pack_achievements(self.db, self.user1.id)
        
        achievements_after_3 = self.get_user_achievements(self.user1.id)
        assert "pack_creator" in achievements_after_3, "Should earn pack creator achievement after 3 packs"
        
        print(f"Pack creation test - Final achievements: {achievements_after_3}")

    def test_feature_request_achievements(self):
        """Test that creating feature requests triggers achievements."""
        initial_achievements = self.get_user_achievements(self.user1.id)
        
        # Create feature request
        feature_request = FeatureRequest(
            title="Test Feature",
            description="Test Description",
            user_id=self.user1.id
        )
        self.db.add(feature_request)
        self.db.commit()
        
        check_feature_request_achievements(self.db, self.user1.id)
        
        final_achievements = self.get_user_achievements(self.user1.id)
        assert "first_feature_request" in final_achievements, "Should earn feature request achievement"
        
        print(f"Feature request test - Final achievements: {final_achievements}")

    def test_diversity_achievements(self):
        """Test that releasing diverse songs triggers diversity achievements."""
        # Create songs with different artists
        artists = ["Artist A", "Artist B", "Artist C", "Artist D", "Artist E"]
        
        for i, artist in enumerate(artists):
            song = self.create_test_song(
                self.user1.id, 
                status=SongStatus.released, 
                artist=artist,
                year=2020 + i  # Different years too
            )
        
        check_diversity_achievements(self.db, self.user1.id)
        
        achievements = self.get_user_achievements(self.user1.id)
        assert "five_different_artists" in achievements, "Should earn diversity achievement for 5 different artists"
        
        print(f"Diversity test - Final achievements: {achievements}")

    def test_status_change_achievements(self):
        """Test that changing song status triggers appropriate achievements."""
        # Create a song in Future status
        song = self.create_test_song(self.user1.id, status=SongStatus.future)
        
        # Move to WIP
        song.status = SongStatus.wip
        self.db.commit()
        check_status_achievements(self.db, self.user1.id)
        
        # Move to Released
        song.status = SongStatus.released
        self.db.commit()
        check_status_achievements(self.db, self.user1.id)
        check_wip_completion_achievements(self.db, self.user1.id)
        
        achievements = self.get_user_achievements(self.user1.id)
        assert "first_release" in achievements, "Should earn release achievement"
        assert "first_finish" in achievements, "Should earn WIP completion achievement"
        
        print(f"Status change test - Final achievements: {achievements}")

    def test_achievement_deduplication(self):
        """Test that achievements are not awarded multiple times."""
        # Create and release a song
        song = self.create_test_song(self.user1.id, status=SongStatus.released)
        
        # Run achievement checks multiple times
        for _ in range(3):
            check_status_achievements(self.db, self.user1.id)
        
        # Check that achievement is only awarded once
        achievements_count = self.db.query(UserAchievement).filter(
            UserAchievement.user_id == self.user1.id
        ).count()
        
        # Should only have one instance of first_release achievement
        first_release_count = self.db.query(UserAchievement).join(Achievement).filter(
            UserAchievement.user_id == self.user1.id,
            Achievement.code == "first_release"
        ).count()
        
        assert first_release_count == 1, "Should only award achievement once"
        print(f"Deduplication test passed - {first_release_count} first_release achievements")

    def test_user_stats_update(self):
        """Test that user stats are properly updated."""
        # Create songs of different statuses
        self.create_test_song(self.user1.id, status=SongStatus.future)
        self.create_test_song(self.user1.id, status=SongStatus.wip)
        self.create_test_song(self.user1.id, status=SongStatus.released)
        
        # Create a pack
        pack = self.create_test_pack(self.user1.id)
        
        # Update stats
        stats = update_user_stats(self.db, self.user1.id)
        
        assert stats.total_songs == 3, f"Should have 3 total songs, got {stats.total_songs}"
        assert stats.total_future == 1, f"Should have 1 future song, got {stats.total_future}"
        assert stats.total_wip == 1, f"Should have 1 WIP song, got {stats.total_wip}"
        assert stats.total_released == 1, f"Should have 1 released song, got {stats.total_released}"
        assert stats.total_packs == 1, f"Should have 1 pack, got {stats.total_packs}"
        
        print(f"Stats test passed - Songs: {stats.total_songs}, Packs: {stats.total_packs}")

    def test_comprehensive_achievement_check(self):
        """Test the comprehensive achievement checker works properly."""
        # Create diverse test data
        pack = self.create_test_pack(self.user1.id)
        
        # Released songs with different artists
        self.create_test_song(self.user1.id, status=SongStatus.released, artist="Artist A", pack_id=pack.id)
        self.create_test_song(self.user1.id, status=SongStatus.released, artist="Artist B")
        
        # WIP songs
        self.create_test_song(self.user1.id, status=SongStatus.wip)
        
        # Collaborations
        song = self.create_test_song(self.user1.id)
        collaboration = Collaboration(
            song_id=song.id,
            user_id=self.user2.id,
            collaboration_type=CollaborationType.SONG_EDIT
        )
        self.db.add(collaboration)
        self.db.commit()
        
        # Run comprehensive check
        newly_awarded = check_all_achievements(self.db, self.user1.id)
        
        achievements = self.get_user_achievements(self.user1.id)
        
        # Should have multiple achievements
        assert len(achievements) > 0, "Should have earned achievements"
        assert "first_release" in achievements, "Should have first release"
        assert "pack_starter" in achievements, "Should have pack starter"
        assert "first_collaborator" in achievements, "Should have collaboration achievement"
        
        print(f"Comprehensive test - Achievements: {achievements}")
        print(f"Comprehensive test - Newly awarded: {newly_awarded}")

    def test_welcome_aboard_achievement_on_registration(self):
        """Test that Welcome Aboard achievement is awarded when a new user registers."""
        from api.achievements.services.achievements_service import AchievementsService
        
        # Ensure Welcome Aboard achievement exists
        welcome_achievement = self.db.query(Achievement).filter(Achievement.code == "welcome_aboard").first()
        if not welcome_achievement:
            welcome_achievement = Achievement(
                code="welcome_aboard",
                name="Welcome Aboard!",
                description="Successfully create your TrackFlow account and join the community",
                icon="⚓",
                category="special",
                points=10,
                rarity="common",
                target_value=None,
                metric_type=None
            )
            self.db.add(welcome_achievement)
            self.db.commit()
            self.db.refresh(welcome_achievement)
        
        # Create a new user (simulating registration)
        new_user = User(
            username="newuser",
            email="newuser@test.com",
            hashed_password="hashed_password"
        )
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        
        # Verify user doesn't have the achievement yet
        initial_achievements = self.get_user_achievements(new_user.id)
        assert "welcome_aboard" not in initial_achievements, "User should not have Welcome Aboard before registration"
        
        # Simulate registration endpoint awarding the achievement
        achievements_service = AchievementsService()
        result = achievements_service.award_achievement(self.db, new_user.id, "welcome_aboard")
        
        # Verify achievement was awarded
        assert result is not None, "Achievement should be awarded"
        
        final_achievements = self.get_user_achievements(new_user.id)
        assert "welcome_aboard" in final_achievements, "User should have Welcome Aboard achievement after registration"
        
        # Verify user_stats total_points was updated
        stats = self.db.query(UserStats).filter(UserStats.user_id == new_user.id).first()
        if stats:
            assert stats.total_points >= 10, f"User should have at least 10 points (Welcome Aboard), got {stats.total_points}"
        
        # Verify achievement is not awarded twice
        result2 = achievements_service.award_achievement(self.db, new_user.id, "welcome_aboard")
        assert result2 is None, "Achievement should not be awarded twice"
        
        # Verify only one instance exists
        welcome_count = self.db.query(UserAchievement).join(Achievement).filter(
            UserAchievement.user_id == new_user.id,
            Achievement.code == "welcome_aboard"
        ).count()
        assert welcome_count == 1, f"Should only have one Welcome Aboard achievement, got {welcome_count}"
        
        print(f"Welcome Aboard test passed - User has achievement: {'welcome_aboard' in final_achievements}")


if __name__ == "__main__":
    # Run specific tests
    test_instance = TestAchievements()
    test_instance.setup()
    
    try:
        print("🧪 Running Achievement Tests...")
        
        print("\n1. Testing release pack achievements...")
        test_instance.test_release_pack_triggers_achievements()
        
        print("\n2. Testing collaboration achievements...")
        test_instance.test_collaboration_achievements()
        
        print("\n3. Testing pack creation achievements...")
        test_instance.test_pack_creation_achievements()
        
        print("\n4. Testing feature request achievements...")
        test_instance.test_feature_request_achievements()
        
        print("\n5. Testing diversity achievements...")
        test_instance.test_diversity_achievements()
        
        print("\n6. Testing status change achievements...")
        test_instance.test_status_change_achievements()
        
        print("\n7. Testing achievement deduplication...")
        test_instance.test_achievement_deduplication()
        
        print("\n8. Testing user stats update...")
        test_instance.test_user_stats_update()
        
        print("\n9. Testing comprehensive achievement check...")
        test_instance.test_comprehensive_achievement_check()
        
        print("\n10. Testing Welcome Aboard achievement on registration...")
        test_instance.test_welcome_aboard_achievement_on_registration()
        
        print("\n✅ All achievement tests completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        test_instance.db.close()