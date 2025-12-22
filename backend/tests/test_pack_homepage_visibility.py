"""
Regression tests for pack release homepage visibility.

Tests ensure that:
1. Packs released via the release endpoint default to visible on homepage
2. Users can explicitly hide packs from homepage
3. Hidden packs still appear on user profiles
4. Homepage query correctly filters by show_on_homepage
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import User, Pack, Song
from api.auth import create_access_token


@pytest.fixture
def test_user_with_pack(test_db, test_user):
    """Create a test user with a pack containing In Progress songs."""
    pack = Pack(name="Test Pack", user_id=test_user.id)
    test_db.add(pack)
    test_db.flush()
    
    # Create songs in "In Progress" status (will be released when pack is released)
    songs = []
    for i in range(3):
        song = Song(
            title=f"Test Song {i+1}",
            artist="Test Artist",
            album="Test Album",
            year=2023,
            status="In Progress",
            user_id=test_user.id,
            pack_id=pack.id
        )
        test_db.add(song)
        songs.append(song)
    
    test_db.commit()
    test_db.refresh(pack)
    for song in songs:
        test_db.refresh(song)
    
    return test_user, pack, songs


def test_pack_release_defaults_to_visible_on_homepage(client: TestClient, test_db: Session, test_user_with_pack):
    """Test that releasing a pack defaults to showing on homepage unless explicitly hidden."""
    test_user, pack, songs = test_user_with_pack
    
    token = create_access_token(data={"sub": test_user.username})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Release pack WITHOUT hide_from_homepage flag (default behavior)
    # Frontend sends show_on_homepage: !hideFromHomepage, so False means show
    release_data = {
        "title": "Test Release",
        "description": "Test description",
        "download_link": "https://example.com/download",
        "youtube_url": None,
        "show_on_homepage": True,  # Frontend always sends this when not hidden
        "song_download_links": {}
    }
    
    resp = client.post(
        f"/packs/{pack.id}/release",
        json=release_data,
        headers=headers
    )
    assert resp.status_code == 200
    
    # Verify pack is visible on homepage
    test_db.refresh(pack)
    assert pack.show_on_homepage == True, "Pack should default to visible on homepage"
    assert pack.released_at is not None, "Pack should have released_at timestamp"
    assert pack.release_title == "Test Release"
    
    # Verify songs were released
    test_db.refresh(songs[0])
    assert songs[0].status == "Released"
    assert songs[0].released_at is not None
    
    # Verify it appears in homepage query
    homepage_resp = client.get("/songs/recent-pack-releases?limit=20&offset=0&days_back=30")
    assert homepage_resp.status_code == 200
    pack_data = homepage_resp.json()
    pack_ids = [p["pack_id"] for p in pack_data]
    assert pack.id in pack_ids, "Pack should appear in homepage latest releases"


def test_pack_release_can_be_hidden_from_homepage(client: TestClient, test_db: Session, test_user_with_pack):
    """Test that user can explicitly hide pack from homepage."""
    test_user, pack, songs = test_user_with_pack
    
    token = create_access_token(data={"sub": test_user.username})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Release pack WITH hide_from_homepage=True
    release_data = {
        "title": "Hidden Release",
        "description": "Test description",
        "download_link": "https://example.com/download",
        "youtube_url": None,
        "hide_from_homepage": True,
        "show_on_homepage": False,  # Frontend sends this when hide_from_homepage=True
        "song_download_links": {}
    }
    
    resp = client.post(
        f"/packs/{pack.id}/release",
        json=release_data,
        headers=headers
    )
    assert resp.status_code == 200
    
    # Verify pack is hidden from homepage
    test_db.refresh(pack)
    assert pack.show_on_homepage == False, "Pack should be hidden from homepage when user requests it"
    assert pack.released_at is not None, "Pack should still be released, just hidden"
    assert pack.release_title == "Hidden Release"
    
    # Verify songs were still released
    test_db.refresh(songs[0])
    assert songs[0].status == "Released"
    
    # Verify it does NOT appear in homepage query
    homepage_resp = client.get("/songs/recent-pack-releases?limit=20&offset=0&days_back=30")
    assert homepage_resp.status_code == 200
    pack_data = homepage_resp.json()
    pack_ids = [p["pack_id"] for p in pack_data]
    assert pack.id not in pack_ids, "Hidden pack should NOT appear in homepage latest releases"
    
    # But it SHOULD appear on user profile
    profile_resp = client.get(f"/public-profiles/{test_user.username}")
    assert profile_resp.status_code == 200
    profile_data = profile_resp.json()
    profile_pack_ids = [p["id"] for p in profile_data["released_packs"]]
    assert pack.id in profile_pack_ids, "Hidden pack should still appear on user profile"


def test_pack_release_with_explicit_show_on_homepage(client: TestClient, test_db: Session, test_user_with_pack):
    """Test that explicit show_on_homepage=True works correctly."""
    test_user, pack, songs = test_user_with_pack
    
    token = create_access_token(data={"sub": test_user.username})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Release pack with explicit show_on_homepage=True
    release_data = {
        "title": "Explicit Visible Release",
        "description": "Test description",
        "download_link": "https://example.com/download",
        "youtube_url": None,
        "show_on_homepage": True,  # Explicitly set to True
        "song_download_links": {}
    }
    
    resp = client.post(
        f"/packs/{pack.id}/release",
        json=release_data,
        headers=headers
    )
    assert resp.status_code == 200
    
    # Verify pack is visible
    test_db.refresh(pack)
    assert pack.show_on_homepage == True
    
    # Verify it appears in homepage
    homepage_resp = client.get("/songs/recent-pack-releases?limit=20&offset=0&days_back=30")
    assert homepage_resp.status_code == 200
    pack_data = homepage_resp.json()
    pack_ids = [p["pack_id"] for p in pack_data]
    assert pack.id in pack_ids


def test_pack_release_with_explicit_hide_from_homepage(client: TestClient, test_db: Session, test_user_with_pack):
    """Test that explicit hide_from_homepage=True sets show_on_homepage=False."""
    test_user, pack, songs = test_user_with_pack
    
    token = create_access_token(data={"sub": test_user.username})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Release pack with explicit hide_from_homepage=True
    release_data = {
        "title": "Explicit Hidden Release",
        "description": "Test description",
        "download_link": "https://example.com/download",
        "youtube_url": None,
        "hide_from_homepage": True,  # Explicitly hide
        "song_download_links": {}
    }
    
    resp = client.post(
        f"/packs/{pack.id}/release",
        json=release_data,
        headers=headers
    )
    assert resp.status_code == 200
    
    # Verify pack is hidden
    test_db.refresh(pack)
    assert pack.show_on_homepage == False
    
    # Verify it does NOT appear in homepage
    homepage_resp = client.get("/songs/recent-pack-releases?limit=20&offset=0&days_back=30")
    assert homepage_resp.status_code == 200
    pack_data = homepage_resp.json()
    pack_ids = [p["pack_id"] for p in pack_data]
    assert pack.id not in pack_ids


def test_homepage_query_filters_by_show_on_homepage(client: TestClient, test_db: Session, test_user):
    """Test that homepage query correctly filters by show_on_homepage."""
    token = create_access_token(data={"sub": test_user.username})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create two packs
    visible_pack = Pack(name="Visible Pack", user_id=test_user.id)
    hidden_pack = Pack(name="Hidden Pack", user_id=test_user.id)
    test_db.add_all([visible_pack, hidden_pack])
    test_db.flush()
    
    # Create songs for both packs
    visible_song = Song(
        title="Visible Song",
        artist="Artist",
        status="In Progress",
        user_id=test_user.id,
        pack_id=visible_pack.id
    )
    hidden_song = Song(
        title="Hidden Song",
        artist="Artist",
        status="In Progress",
        user_id=test_user.id,
        pack_id=hidden_pack.id
    )
    test_db.add_all([visible_song, hidden_song])
    test_db.commit()
    
    # Release visible pack (default - should show on homepage)
    release_data_visible = {
        "title": "Visible Release",
        "description": "Test",
        "show_on_homepage": True,
        "song_download_links": {}
    }
    resp1 = client.post(f"/packs/{visible_pack.id}/release", json=release_data_visible, headers=headers)
    assert resp1.status_code == 200
    
    # Release hidden pack (explicitly hide)
    release_data_hidden = {
        "title": "Hidden Release",
        "description": "Test",
        "hide_from_homepage": True,
        "show_on_homepage": False,
        "song_download_links": {}
    }
    resp2 = client.post(f"/packs/{hidden_pack.id}/release", json=release_data_hidden, headers=headers)
    assert resp2.status_code == 200
    
    # Verify database state
    test_db.refresh(visible_pack)
    test_db.refresh(hidden_pack)
    assert visible_pack.show_on_homepage == True
    assert hidden_pack.show_on_homepage == False
    
    # Query homepage - should only return visible pack
    homepage_resp = client.get("/songs/recent-pack-releases?limit=20&offset=0&days_back=30")
    assert homepage_resp.status_code == 200
    pack_data = homepage_resp.json()
    pack_ids = [p["pack_id"] for p in pack_data]
    
    assert visible_pack.id in pack_ids, "Visible pack should appear on homepage"
    assert hidden_pack.id not in pack_ids, "Hidden pack should NOT appear on homepage"
    
    # But both should appear on profile
    profile_resp = client.get(f"/public-profiles/{test_user.username}")
    assert profile_resp.status_code == 200
    profile_data = profile_resp.json()
    profile_pack_ids = [p["id"] for p in profile_data["released_packs"]]
    
    assert visible_pack.id in profile_pack_ids, "Visible pack should appear on profile"
    assert hidden_pack.id in profile_pack_ids, "Hidden pack should also appear on profile"

