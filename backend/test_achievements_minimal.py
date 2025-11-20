#!/usr/bin/env python3
"""
Minimal achievement system tests for CI - focuses on code verification without database complexity.
"""

import sys
import os

def test_achievement_imports():
    """Test that all achievement functions can be imported."""
    print("🧪 Testing Achievement System Imports...")
    
    try:
        from api.achievements import (
            check_status_achievements, 
            check_collaboration_achievements,
            check_social_achievements,
            check_pack_achievements,
            check_all_achievements,
            update_user_stats
        )
        print("   ✅ All achievement functions imported successfully")
        return True
    except ImportError as e:
        print(f"   ❌ Achievement import failed: {e}")
        return False


def test_api_integration():
    """Test that API modules have proper achievement integration."""
    print("\n🧪 Testing API Achievement Integration...")
    
    success = True
    
    # Test songs.py integration
    try:
        with open('api/songs.py', 'r') as f:
            songs_content = f.read()
            
        has_imports = 'from api.achievements import' in songs_content
        has_release_pack_fix = 'check_status_achievements' in songs_content and 'release_pack' in songs_content
        has_collab_fix = 'check_collaboration_achievements' in songs_content
        
        print(f"   songs.py achievement imports: {'✅' if has_imports else '❌'}")
        print(f"   release pack fix: {'✅' if has_release_pack_fix else '❌'}")
        print(f"   collaboration fix: {'✅' if has_collab_fix else '❌'}")
        
        if not (has_imports and has_release_pack_fix and has_collab_fix):
            success = False
            
    except Exception as e:
        print(f"   ❌ Error checking songs.py: {e}")
        success = False
    
    # Test collaborations.py integration
    try:
        with open('api/collaborations.py', 'r') as f:
            collab_content = f.read()
            
        has_imports = 'from api.achievements import' in collab_content
        has_social_checks = 'check_social_achievements' in collab_content
        has_collab_checks = 'check_collaboration_achievements' in collab_content
        
        print(f"   collaborations.py achievement imports: {'✅' if has_imports else '❌'}")
        print(f"   social achievement checks: {'✅' if has_social_checks else '❌'}")
        print(f"   collaboration checks: {'✅' if has_collab_checks else '❌'}")
        
        if not (has_imports and has_social_checks and has_collab_checks):
            success = False
            
    except Exception as e:
        print(f"   ❌ Error checking collaborations.py: {e}")
        success = False
    
    # Test packs.py integration
    try:
        with open('api/packs.py', 'r') as f:
            packs_content = f.read()
            
        has_pack_checks = 'check_pack_achievements' in packs_content
        
        print(f"   packs.py achievement checks: {'✅' if has_pack_checks else '❌'}")
        
        if not has_pack_checks:
            success = False
            
    except Exception as e:
        print(f"   ❌ Error checking packs.py: {e}")
        success = False
    
    return success


def test_model_structure():
    """Test that achievement models are properly defined."""
    print("\n🧪 Testing Achievement Model Structure...")
    
    try:
        from models import Achievement, UserAchievement, UserStats
        
        # Test Achievement model has required fields
        achievement_fields = Achievement.__table__.columns.keys()
        required_fields = ['id', 'code', 'name', 'description', 'target_value', 'metric_type']
        missing_fields = [field for field in required_fields if field not in achievement_fields]
        
        if missing_fields:
            print(f"   ❌ Achievement model missing fields: {missing_fields}")
            return False
        else:
            print("   ✅ Achievement model has all required fields")
        
        # Test UserAchievement model
        user_achievement_fields = UserAchievement.__table__.columns.keys()
        required_ua_fields = ['id', 'user_id', 'achievement_id', 'earned_at']
        missing_ua_fields = [field for field in required_ua_fields if field not in user_achievement_fields]
        
        if missing_ua_fields:
            print(f"   ❌ UserAchievement model missing fields: {missing_ua_fields}")
            return False
        else:
            print("   ✅ UserAchievement model has all required fields")
            
        return True
        
    except Exception as e:
        print(f"   ❌ Model structure test failed: {e}")
        return False


def test_fix_verification():
    """Verify that the specific achievement fixes are in place."""
    print("\n🧪 Testing Achievement Fix Verification...")
    
    fixes = {
        "Release Pack Achievement Triggers": False,
        "Collaboration Social Achievements": False, 
        "Song Update Collaboration Achievements": False,
        "Pack Creation Achievements": False
    }
    
    try:
        # Check release pack fix
        with open('api/songs.py', 'r') as f:
            songs_content = f.read()
            if 'def release_pack' in songs_content and 'check_status_achievements' in songs_content:
                fixes["Release Pack Achievement Triggers"] = True
                
        # Check collaboration fix
        with open('api/collaborations.py', 'r') as f:
            collab_content = f.read()
            if 'check_social_achievements' in collab_content:
                fixes["Collaboration Social Achievements"] = True
                
        # Check song collaboration fix
        with open('api/songs.py', 'r') as f:
            songs_content = f.read()
            if 'check_collaboration_achievements' in songs_content:
                fixes["Song Update Collaboration Achievements"] = True
                
        # Check pack creation fix
        with open('api/packs.py', 'r') as f:
            packs_content = f.read()
            if 'check_pack_achievements' in packs_content:
                fixes["Pack Creation Achievements"] = True
                
    except Exception as e:
        print(f"   ❌ Error during fix verification: {e}")
        return False
    
    # Report results
    all_fixed = True
    for fix_name, is_fixed in fixes.items():
        status = "✅" if is_fixed else "❌"
        print(f"   {status} {fix_name}")
        if not is_fixed:
            all_fixed = False
    
    return all_fixed


def main():
    """Run all minimal tests."""
    print("🏆 Minimal Achievement System Tests")
    print("=" * 50)
    
    tests = [
        ("Achievement Imports", test_achievement_imports),
        ("API Integration", test_api_integration), 
        ("Model Structure", test_model_structure),
        ("Fix Verification", test_fix_verification)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("🏆 TEST RESULTS")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
        if result:
            passed += 1
    
    print(f"\nTests passed: {passed}/{len(results)}")
    
    if passed == len(results):
        print("\n🎉 All minimal tests passed! Achievement system integration verified.")
        return True
    else:
        print("\n⚠️ Some tests failed. Achievement system may have integration issues.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)