#!/usr/bin/env python3
"""
Simple test runner for achievement system.
Run this script to test all achievement triggers and verify the fixes.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Base, User, Song, SongStatus, Pack, Achievement, UserAchievement, Collaboration, CollaborationType, FeatureRequest
from api.achievements import (
    check_all_achievements, check_status_achievements, check_collaboration_achievements, 
    check_social_achievements, check_pack_achievements, check_feature_request_achievements,
    update_user_stats, award_achievement
)
from datetime import datetime
import traceback


def cleanup_test_data(db):
    """Clean up any existing test data."""
    try:
        # Delete test users and their related data
        test_users = db.query(User).filter(User.username.like('testuser%')).all()
        for user in test_users:
            # Delete user achievements
            db.query(UserAchievement).filter(UserAchievement.user_id == user.id).delete()
            # Delete collaborations
            db.query(Collaboration).filter(Collaboration.user_id == user.id).delete()
            # Delete songs
            db.query(Song).filter(Song.user_id == user.id).delete()
            # Delete packs
            db.query(Pack).filter(Pack.user_id == user.id).delete()
            # Delete feature requests
            db.query(FeatureRequest).filter(FeatureRequest.user_id == user.id).delete()
            # Delete user
            db.delete(user)
        
        db.commit()
        print("✅ Test data cleaned up")
    except Exception as e:
        print(f"⚠️ Cleanup warning: {e}")
        db.rollback()


def create_test_user(db, username: str, email: str) -> User:
    """Create a test user."""
    user = User(username=username, email=email, hashed_password="test_hash")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_release_pack_achievements(db):
    """Test pack release triggers achievements correctly."""
    print("\n🧪 Testing Release Pack Achievement Triggers...")
    
    # Create test user
    user = create_test_user(db, "testuser_pack", "pack@test.com")
    
    # Create pack
    pack = Pack(name="Test Release Pack", user_id=user.id)
    db.add(pack)
    db.commit()
    db.refresh(pack)
    
    # Create WIP songs that will be "released" 
    song1 = Song(title="Song 1", artist="Artist A", status=SongStatus.wip, user_id=user.id, pack_id=pack.id, year=2020)
    song2 = Song(title="Song 2", artist="Artist B", status=SongStatus.wip, user_id=user.id, pack_id=pack.id, year=2021)
    db.add(song1)
    db.add(song2)
    db.commit()
    
    # Check initial achievements
    initial_achievements = db.query(Achievement.code).join(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    initial_count = len(initial_achievements)
    print(f"   Initial achievements: {initial_count}")
    
    # Simulate pack release (move songs to released)
    song1.status = SongStatus.released
    song2.status = SongStatus.released
    db.commit()
    
    # Trigger achievement checks (this is what our fix added to release_pack function)
    print("   Checking status achievements...")
    check_status_achievements(db, user.id)
    
    print("   Checking WIP completion achievements...")
    from api.achievements import check_wip_completion_achievements
    check_wip_completion_achievements(db, user.id)
    
    print("   Checking diversity achievements...")
    from api.achievements import check_diversity_achievements  
    check_diversity_achievements(db, user.id)
    
    # Check final achievements
    final_achievements = db.query(Achievement.code).join(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    final_count = len(final_achievements)
    achievement_codes = [code[0] for code in final_achievements]
    
    print(f"   Final achievements: {final_count}")
    print(f"   Earned: {achievement_codes}")
    
    # Verify we got the expected achievements
    success = final_count > initial_count
    print(f"   ✅ Pack release achievements: {'PASS' if success else 'FAIL'}")
    
    return success


def test_collaboration_achievements(db):
    """Test collaboration triggers achievements correctly."""
    print("\n🧪 Testing Collaboration Achievement Triggers...")
    
    # Create test users
    owner = create_test_user(db, "testuser_owner", "owner@test.com")
    collaborator = create_test_user(db, "testuser_collab", "collab@test.com")
    
    # Create song
    song = Song(title="Collaboration Song", artist="Test Artist", status=SongStatus.wip, user_id=owner.id)
    db.add(song)
    db.commit()
    db.refresh(song)
    
    # Check initial achievements
    owner_initial = db.query(UserAchievement).filter(UserAchievement.user_id == owner.id).count()
    collab_initial = db.query(UserAchievement).filter(UserAchievement.user_id == collaborator.id).count()
    print(f"   Owner initial achievements: {owner_initial}")
    print(f"   Collaborator initial achievements: {collab_initial}")
    
    # Add collaboration
    collaboration = Collaboration(
        song_id=song.id,
        user_id=collaborator.id,
        collaboration_type=CollaborationType.SONG_EDIT
    )
    db.add(collaboration)
    db.commit()
    
    # Trigger achievement checks (this is what our fix ensures happens)
    print("   Checking owner collaboration achievements...")
    check_collaboration_achievements(db, owner.id)
    
    print("   Checking collaborator social achievements...")
    check_social_achievements(db, collaborator.id)
    
    # Check final achievements
    owner_final = db.query(UserAchievement).filter(UserAchievement.user_id == owner.id).count()
    collab_final = db.query(UserAchievement).filter(UserAchievement.user_id == collaborator.id).count()
    
    print(f"   Owner final achievements: {owner_final}")
    print(f"   Collaborator final achievements: {collab_final}")
    
    success = (owner_final > owner_initial) or (collab_final > collab_initial)
    print(f"   ✅ Collaboration achievements: {'PASS' if success else 'FAIL'}")
    
    return success


def test_pack_creation_achievements(db):
    """Test pack creation triggers achievements."""
    print("\n🧪 Testing Pack Creation Achievement Triggers...")
    
    user = create_test_user(db, "testuser_packs", "packs@test.com")
    
    initial_count = db.query(UserAchievement).filter(UserAchievement.user_id == user.id).count()
    print(f"   Initial achievements: {initial_count}")
    
    # Create packs
    for i in range(3):
        pack = Pack(name=f"Pack {i+1}", user_id=user.id)
        db.add(pack)
        db.commit()
        
        # Check achievements after each pack
        check_pack_achievements(db, user.id)
    
    final_count = db.query(UserAchievement).filter(UserAchievement.user_id == user.id).count()
    achievement_codes = db.query(Achievement.code).join(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    codes = [code[0] for code in achievement_codes]
    
    print(f"   Final achievements: {final_count}")
    print(f"   Earned: {codes}")
    
    success = final_count > initial_count
    print(f"   ✅ Pack creation achievements: {'PASS' if success else 'FAIL'}")
    
    return success


def test_feature_request_achievements(db):
    """Test feature request creation triggers achievements."""
    print("\n🧪 Testing Feature Request Achievement Triggers...")
    
    user = create_test_user(db, "testuser_features", "features@test.com")
    
    initial_count = db.query(UserAchievement).filter(UserAchievement.user_id == user.id).count()
    print(f"   Initial achievements: {initial_count}")
    
    # Create feature request
    feature_request = FeatureRequest(
        title="Test Feature",
        description="Test feature description",
        user_id=user.id
    )
    db.add(feature_request)
    db.commit()
    
    # Check achievements
    check_feature_request_achievements(db, user.id)
    
    final_count = db.query(UserAchievement).filter(UserAchievement.user_id == user.id).count()
    achievement_codes = db.query(Achievement.code).join(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    codes = [code[0] for code in achievement_codes]
    
    print(f"   Final achievements: {final_count}")
    print(f"   Earned: {codes}")
    
    success = final_count > initial_count  
    print(f"   ✅ Feature request achievements: {'PASS' if success else 'FAIL'}")
    
    return success


def test_comprehensive_check(db):
    """Test the comprehensive achievement checker."""
    print("\n🧪 Testing Comprehensive Achievement Check...")
    
    user = create_test_user(db, "testuser_comprehensive", "comprehensive@test.com")
    
    # Create diverse test data
    pack = Pack(name="Comprehensive Pack", user_id=user.id)
    db.add(pack)
    db.commit()
    db.refresh(pack)
    
    # Released songs with different artists (for diversity)
    artists = ["Artist A", "Artist B", "Artist C", "Artist D", "Artist E"]
    for i, artist in enumerate(artists):
        song = Song(
            title=f"Song {i+1}",
            artist=artist,
            status=SongStatus.released,
            user_id=user.id,
            pack_id=pack.id,
            year=2020 + i
        )
        db.add(song)
    db.commit()
    
    # Run comprehensive achievement check
    print("   Running comprehensive achievement check...")
    newly_awarded = check_all_achievements(db, user.id)
    
    final_achievements = db.query(Achievement.code).join(UserAchievement).filter(
        UserAchievement.user_id == user.id
    ).all()
    codes = [code[0] for code in final_achievements]
    
    print(f"   Newly awarded: {newly_awarded}")
    print(f"   Total achievements: {len(final_achievements)}")
    print(f"   Achievement codes: {codes}")
    
    success = len(final_achievements) > 0
    print(f"   ✅ Comprehensive check: {'PASS' if success else 'FAIL'}")
    
    return success


def run_all_tests():
    """Run all achievement tests."""
    print("🏆 Starting Achievement System Test Suite")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Clean up any existing test data
        cleanup_test_data(db)
        
        # Run tests
        results = []
        
        results.append(test_release_pack_achievements(db))
        cleanup_test_data(db)
        
        results.append(test_collaboration_achievements(db))
        cleanup_test_data(db)
        
        results.append(test_pack_creation_achievements(db))
        cleanup_test_data(db)
        
        results.append(test_feature_request_achievements(db))
        cleanup_test_data(db)
        
        results.append(test_comprehensive_check(db))
        cleanup_test_data(db)
        
        # Summary
        print("\n" + "=" * 60)
        print("🏆 ACHIEVEMENT TEST RESULTS")
        print("=" * 60)
        
        test_names = [
            "Release Pack Achievements",
            "Collaboration Achievements", 
            "Pack Creation Achievements",
            "Feature Request Achievements",
            "Comprehensive Check"
        ]
        
        passed = 0
        for i, result in enumerate(results):
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_names[i]:.<40} {status}")
            if result:
                passed += 1
        
        print("-" * 60)
        print(f"Tests passed: {passed}/{len(results)}")
        
        if passed == len(results):
            print("\n🎉 ALL TESTS PASSED! Achievement system is working correctly!")
        else:
            print(f"\n⚠️ {len(results) - passed} test(s) failed. Check the issues above.")
            
        return passed == len(results)
        
    except Exception as e:
        print(f"❌ Test suite failed with error: {e}")
        traceback.print_exc()
        return False
        
    finally:
        # Final cleanup
        cleanup_test_data(db)
        db.close()


if __name__ == "__main__":
    print("🚀 Running Achievement Test Suite...")
    success = run_all_tests()
    sys.exit(0 if success else 1)