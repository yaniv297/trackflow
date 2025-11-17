# TrackFlow Achievements & Badges System

## Overview

A gamification system to reward users for their engagement and contributions to TrackFlow.

## Phase 1: Core Achievements System (Current Implementation)

**Goal:** Build a complete gamification system with points, rarity, and all achievements. Notifications and community features come later.

## Database Schema

### Tables Needed

1. **achievements** - Master list of all available achievements

   - `id` (Integer, Primary Key)
   - `code` (String, Unique) - e.g., "first_song", "hundred_songs"
   - `name` (String) - Display name
   - `description` (String) - What the user needs to do
   - `icon` (String) - Emoji or icon identifier
   - `category` (String) - "milestone", "activity", "quality", "social", "special"
   - `points` (Integer) - Points awarded
   - `rarity` (String) - "common", "uncommon", "rare", "epic", "legendary"
   - `created_at` (DateTime)

2. **user_achievements** - Tracks which achievements users have earned

   - `id` (Integer, Primary Key)
   - `user_id` (Integer, Foreign Key to users)
   - `achievement_id` (Integer, Foreign Key to achievements)
   - `earned_at` (DateTime) - When the achievement was unlocked
   - `notified` (Boolean, default=False) - Whether user has been notified (for Phase 2 notification system)
   - `is_public` (Boolean, default=True) - Whether to show in community feed (for Phase 2)
   - Unique constraint on (user_id, achievement_id)

3. **user_stats** - Cached stats for quick achievement checking (optional optimization)
   - `user_id` (Integer, Primary Key, Foreign Key)
   - `total_songs` (Integer, default=0)
   - `total_released` (Integer, default=0)
   - `total_packs` (Integer, default=0)
   - `total_collaborations` (Integer, default=0)
   - `total_spotify_imports` (Integer, default=0)
   - `total_feature_requests` (Integer, default=0)
   - `login_streak` (Integer, default=0)
   - `last_login_date` (Date, nullable)
   - `updated_at` (DateTime)

## Achievement List

### Milestone Achievements (Count-based)

#### Future Plans Songs (Planning/Vision)

- **Dreamer** 💭 - Add your first song to Future Plans
- **Visionary** 🔮 - Add 5 songs to Future Plans
- **Long Term Planner** 📋 - Add 10 songs to Future Plans
- **Strategic Thinker** 🗺️ - Add 25 songs to Future Plans
- **Master Planner** 📊 - Add 50 songs to Future Plans
- **Future Architect** 🏗️ - Add 100 songs to Future Plans
- **Planning Legend** 📐 - Add 250 songs to Future Plans

#### WIP Songs (Work/Progress)

- **Getting Started** 🎬 - Start your first WIP song
- **Hard Worker** 💪 - Start 5 WIP songs
- **Dedicated Creator** 🎨 - Start 10 WIP songs
- **Busy Bee** 🐝 - Start 25 WIP songs
- **Workhorse** 🐴 - Start 50 WIP songs
- **Productivity Master** ⚡ - Start 100 WIP songs
- **Work Legend** 🔨 - Start 250 WIP songs

#### WIP Completions (Finishing Work)

- **First Finish** 🎉 - Complete your first WIP (move to Released)
- **Finisher** ✅ - Complete 5 WIP songs
- **WIP Master** 🏁 - Complete 10 WIP songs
- **Finishing Touch** ✨ - Complete 25 WIP songs
- **Master Finisher** 🎊 - Complete 50 WIP songs
- **Completion Legend** 🎆 - Complete 100 WIP songs
- **Fireworks Master** 🎇 - Complete 250 WIP songs

#### Released Songs (Celebration)

- **First Release** ✨ - Release your first song
- **Rising Star** ⭐ - Release 5 songs
- **Published Artist** 🌟 - Release 10 songs
- **Pro Performer** 💫 - Release 25 songs
- **Chart Topper** 🏆 - Release 50 songs
- **Hall of Fame** 🎖️ - Release 100 songs
- **Legendary Status** 👑 - Release 250 songs

#### Packs

- **Pack Starter** 📦 - Create your first pack
- **Pack Creator** 📚 - Create 3 packs
- **Pack Master** 📖 - Create 5 packs
- **Pack Legend** 📘 - Create 10 packs
- **Pack Collector** 📗 - Create 20 packs

#### Collaborations

- **Team Player** 🤝 - Add your first collaborator
- **Collaborator** 👥 - Have 3 collaborations
- **Social Butterfly** 🦋 - Have 10 collaborations
- **Community Leader** 👑 - Have 25 collaborations

### Activity Achievements (Action-based)

#### Spotify Integration

- **Spotify Explorer** 🎧 - Import from Spotify for the first time
- **Playlist Master** 📋 - Import 5 playlists from Spotify
- **Spotify Power User** 🎵 - Import 10 playlists from Spotify

#### Engagement

- **Early Bird** 🌅 - Log in 3 days in a row
- **Dedicated** 📅 - Log in 7 days in a row
- **Committed** 💪 - Log in 14 days in a row
- **Loyal** ❤️ - Log in 30 days in a row
- **Devoted** 🔥 - Log in 60 days in a row
- **TrackFlow Veteran** 🏅 - Log in 100 days in a row

#### Community Contribution

- **Idea Generator** 💡 - Submit your first feature request
- **Innovator** 🚀 - Submit 5 feature requests
- **Community Voice** 📢 - Submit 10 feature requests
- **Bug Hunter** 🐛 - Report your first bug
- **Quality Guardian** 🛡️ - Report 5 bugs

### Quality Achievements (Completion-based)

#### Song Completion

- **Perfectionist** ✨ - Complete all authoring fields for a song
- **Multi-Talented** 🎭 - Complete 5 fully authored songs
- **Master Craftsman** 🔨 - Complete 10 fully authored songs
- **Artisan** 🎨 - Complete 25 fully authored songs

#### Pack Completion

- **Pack Perfectionist** 📦✨ - Complete all songs in a pack (all fully authored)
- **Pack Master** 📚🏆 - Complete 3 packs fully
- **Pack Legend** 📖👑 - Complete 5 packs fully

#### Album Series

- **Series Starter** 🎬 - Create your first album series
- **Series Master** 🎯 - Complete an album series
- **Series Collector** 📀 - Complete 3 album series
- **Series Legend** 🎪 - Complete 5 album series

### Social Achievements

- **Collaborative Spirit** 🤝 - Be added as a collaborator on someone else's song
- **Popular Collaborator** ⭐ - Be added as a collaborator on 5 songs
- **Sought After** 🌟 - Be added as a collaborator on 10 songs
- **Community Favorite** 💖 - Be added as a collaborator on 25 songs

### Diversity Achievements (Variety)

#### Artist Diversity

- **Variety Seeker** 🎭 - Complete songs from 5 different artists
- **Music Explorer** 🌍 - Complete songs from 10 different artists
- **Artist Collector** 🎨 - Complete songs from 25 different artists
- **Diversity Master** 🌈 - Complete songs from 50 different artists
- **Universal Listener** 🎵 - Complete songs from 100 different artists

#### Year Diversity

- **Time Traveler** ⏰ - Complete songs from 5 different years
- **Decade Explorer** 📅 - Complete songs from 10 different years
- **Era Collector** 🕰️ - Complete songs from 25 different years
- **Timeline Master** 📆 - Complete songs from 50 different years
- **History Buff** 📚 - Complete songs from 100 different years

#### Decade Diversity

- **Decade Dabbler** 🎸 - Complete songs from 2 different decades
- **Multi-Decade** 🎹 - Complete songs from 3 different decades
- **Decade Master** 🎺 - Complete songs from 4 different decades
- **Timeline Legend** 🎻 - Complete songs from 5 different decades

## Display Locations

### 1. User Settings Page

- Add a new "Achievements" tab/section
- Display all achievements in a grid
- Show earned achievements prominently
- Show locked achievements grayed out
- Filter by category
- Show progress for count-based achievements (e.g., "5/10 songs")

### 2. Stats Page

- Add an "Achievements" section at the top
- Show recently earned achievements
- Display achievement progress summary
- Show total points/level if we add a leveling system

### 3. User Profile Popup

- Show top 3-5 most recent/rare achievements as badges
- Click to see full achievements page

### 4. Achievement Unlock Toast

- Simple toast notification when achievement is unlocked (client-side)
- Show achievement icon, name, and description
- Auto-dismiss after a few seconds

Note: Full notification system with bell icon and notification center is Phase 2

## Implementation Approach

### Backend

1. **Database Models** (`models.py`)

   - `Achievement` model
   - `UserAchievement` model
   - `UserStats` model (optional)

2. **Achievement Checker Service** (`api/achievements.py`)

   - Function to check and award achievements
   - Called after relevant actions (create song, release song, etc.)
   - Efficient checking using cached stats

3. **API Endpoints** (`api/achievements.py`)

   - `GET /achievements/` - List all achievements
   - `GET /achievements/me` - Get user's achievements
   - `GET /achievements/me/progress` - Get progress on count-based achievements
   - `POST /achievements/check` - Manually trigger achievement check (admin)

4. **Integration Points**
   - After creating song → check song count achievements
   - After releasing song → check release achievements
   - After creating pack → check pack achievements
   - After adding collaborator → check collaboration achievements
   - After Spotify import → check import achievements
   - After login → check login streak achievements
   - After submitting feature request → check feature request achievements

### Frontend

1. **Achievements Page Component** (`AchievementsPage.js`)

   - Grid display of all achievements
   - Filter by category
   - Show progress bars for count-based achievements
   - Search functionality

2. **Achievement Badge Component** (`AchievementBadge.js`)

   - Reusable badge component
   - Shows icon, name, rarity color
   - Tooltip with description

3. **Achievement Toast** (`AchievementNotification.js`)

   - Simple toast notification when achievement unlocked (client-side only)
   - Show achievement icon, name, and description
   - Note: This is just a simple toast, not the full notification system (that's Phase 2)

4. **Integration**
   - Add achievements section to UserSettings
   - Add achievements section to StatsPage
   - Add badges to UserProfilePopup
   - Add achievement notification handler

## Points & Rarity System

### Points by Rarity

- Common: 10 points
- Uncommon: 25 points
- Rare: 50 points
- Epic: 100 points
- Legendary: 250 points

### Rarity Distribution

- Common: Basic milestones (first song, first pack, etc.)
- Uncommon: Moderate milestones (10 songs, 5 packs, etc.)
- Rare: Significant milestones (50 songs, 25 releases, etc.)
- Epic: Major milestones (100 songs, 100 releases, etc.)
- Legendary: Ultimate achievements (500 songs, 250 releases, all achievements, etc.)

## Phase 2: Future Enhancements (Later)

### Optional Additions

1. **Leveling System** - Convert points to user levels
2. **Leaderboards** - Show top users by points/achievements
3. **Achievement Categories** - Group achievements for completion bonuses
4. **Seasonal Achievements** - Time-limited achievements
5. **Achievement Sharing** - Share achievements on social media
6. **Custom Badges** - Allow admins to create custom achievements

### Phase 2: Notification System (Later)

A comprehensive notification system to keep users engaged and informed.

#### Database Schema

**notifications** table:

- `id` (Integer, Primary Key)
- `user_id` (Integer, Foreign Key to users) - Who receives the notification
- `type` (String) - "achievement_unlocked", "new_release", "collaboration_added", "feature_request_comment", "bug_report_response", etc.
- `title` (String) - Notification title
- `message` (String) - Notification message/description
- `link` (String, nullable) - URL to relevant page (e.g., `/achievements`, `/songs/123`)
- `metadata_json` (Text, nullable) - Additional data (JSON)
- `read` (Boolean, default=False) - Whether user has read it
- `read_at` (DateTime, nullable) - When it was read
- `created_at` (DateTime) - When notification was created
- Indexes on (user_id, read, created_at)

#### Notification Types

1. **Achievement Notifications**

   - Triggered when achievement is unlocked
   - Link to achievements page
   - Show achievement icon and name

2. **Release Notifications**

   - When someone you follow/collaborate with releases a song
   - When a song you're collaborating on is released
   - Link to the released song

3. **Collaboration Notifications**

   - When you're added as a collaborator
   - When a collaborator updates a song you're working on
   - Link to the song/pack

4. **Community Notifications**

   - When someone comments on your feature request
   - When your feature request gets upvoted significantly
   - When a bug you reported is fixed

5. **Social Notifications**
   - When someone follows you (if we add following)
   - When your achievement is featured on community page

#### Implementation

**Backend:**

- `api/notifications.py` - Notification endpoints
  - `GET /notifications/` - Get user's notifications (paginated)
  - `GET /notifications/unread-count` - Get count of unread notifications
  - `PUT /notifications/{id}/read` - Mark as read
  - `PUT /notifications/read-all` - Mark all as read
  - `DELETE /notifications/{id}` - Delete notification
- Notification service to create notifications
- Integration points:
  - After achievement unlock → create notification
  - After song release → notify collaborators
  - After collaboration added → notify user
  - After feature request comment → notify requester

**Frontend:**

- Notification bell icon in header with unread count badge
- Notification dropdown panel
- Notification center page (full list)
- Real-time updates (WebSocket or polling)
- Toast notifications for important events

### Phase 3: Community Feed Page (Later)

A central hub showing community activity, releases, and achievements.

#### Features

1. **Activity Feed**

   - Recent song releases (with album art, artist, user who released)
   - Achievement unlocks (show rare/epic achievements prominently)
   - New packs created
   - Album series completions
   - Filter by: All, Releases, Achievements, Packs, Series

2. **User Profiles**

   - Click on any user to see their profile
   - Show their recent releases
   - Show their achievements (public ones)
   - Show their stats (total songs, releases, etc.)
   - Follow/unfollow users (future)

3. **Achievement Showcase**

   - Recent rare/epic achievements unlocked
   - "Achievement of the Week" highlight
   - Leaderboard of top achievers

4. **Release Highlights**

   - Latest releases with album art grid
   - "Release of the Week" feature
   - Filter by artist, year, pack

5. **Stats Overview**
   - Community-wide stats (total songs, releases, users)
   - Trending artists
   - Most active users this week

#### Database Considerations

**For Community Feed:**

- Add `is_public` flag to `user_achievements` (already added above)
- Add `featured` flag to `user_achievements` for highlighting
- Consider `activity_feed` table for denormalized feed entries (optional optimization)
- Add indexes for efficient feed queries

**Potential Schema:**

```sql
-- Optional: Denormalized feed entries for performance
activity_feed (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  activity_type VARCHAR, -- "release", "achievement", "pack_created", etc.
  activity_id INTEGER, -- ID of the song/achievement/pack
  title VARCHAR,
  description TEXT,
  image_url VARCHAR, -- Album art or achievement icon
  created_at DATETIME,
  INDEX(user_id, created_at)
)
```

#### Implementation

**Backend:**

- `GET /community/feed` - Get community activity feed
  - Query params: `type`, `limit`, `offset`, `user_id` (optional filter)
  - Returns mix of releases, achievements, packs, etc.
- `GET /community/users/{username}` - Get user's public profile
- `GET /community/stats` - Community-wide statistics
- `GET /community/leaderboard` - Top users by achievements/points

**Frontend:**

- `CommunityPage.js` - Main community feed page
- Infinite scroll or pagination
- Filter tabs (All, Releases, Achievements, etc.)
- User profile cards
- Achievement showcase section
- Release grid with hover effects

#### Privacy Considerations

- Users can choose to make achievements private (`is_public = false`)
- Only public achievements show in community feed
- Releases are always public (or add privacy setting later)
- User profiles show only public information

### Phase 4: Social Features (Future)

1. **Following System**

   - Follow other users
   - See their releases in your feed
   - Get notifications when they release

2. **Likes/Reactions**

   - Like releases
   - React to achievements
   - Show appreciation for community contributions

3. **Comments**

   - Comment on releases
   - Comment on achievements
   - Community engagement

4. **Sharing**
   - Share releases externally
   - Share achievements on social media
   - Generate shareable images
