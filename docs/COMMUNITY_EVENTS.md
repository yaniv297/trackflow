# Community Events Feature

## Overview

Community Events are special collaborative packs where all users in the app can participate. Each event is centered around a theme (e.g., Valentine's Day, Halloween) or a random date, and allows users to contribute exactly **one song per user per event**.

## Key Rules

1. **One Song Per User**: Strictly enforced - each user can only have one song in each community event
2. **Simultaneous Release**: All songs are released at the same time when the event ends/is revealed
3. **Hidden Until Release**: RhythmVerse links and submission details are hidden from other users until the event is revealed
4. **Custom Workflows**: Uses each user's personal workflow steps to determine song completion

## Data Model

### Pack Model Extensions

- `is_community_event: Boolean` - Marks a pack as a community event
- `event_theme: String` - Theme of the event
- `event_description: Text` - Description shown to users
- `event_banner_url: String` - Banner image URL
- `event_end_date: DateTime` - When submissions close (NULL = always open)
- `event_revealed_at: DateTime` - When songs were revealed to everyone
- `rv_release_time: DateTime` - RhythmVerse server release time (CET timezone)

### Song Model Extensions

- `rhythmverse_link: String` - Required for submission
- `event_submission_description: String` - Optional description
- `visualizer_link: String` - Optional visualizer URL
- `preview_link: String` - Optional preview/video URL
- `is_event_submitted: Boolean` - Whether the song has been submitted

### CommunityEventRegistration Table

Tracks users who have registered interest but haven't added a song yet:

- `id: Integer` (PK)
- `pack_id: Integer` (FK to packs)
- `user_id: Integer` (FK to users)
- `registered_at: DateTime`

## User Participation Stages

### Stage 0: NOT_REGISTERED

- User hasn't interacted with the event
- Shows event info and "Join Event" button

### Stage 1: REGISTERED

- User clicked "Join" but hasn't added a song
- Shows "Add New Song" inline form or "Move Existing Song" modal
- Song creation includes Spotify auto-enhancement and remaster tag cleaning

### Stage 2: IN_PROGRESS

- User has a song in the event, working on it
- Full WIP song component embedded in the event banner
- Shows "Swap Song" and "Remove from Event" options
- When all workflow steps are complete, shows "Continue to Submit" button

### Stage 3: COMPLETED

- All workflow steps are done, ready to submit
- Shows submission form with:
  - RhythmVerse link (required)
  - Description (optional)
  - Visualizer link (optional)
  - Preview link (optional)
- Displays RhythmVerse release time if set
- Can go back to editing or swap/remove song

### Stage 4: SUBMITTED

- Song has been submitted with RhythmVerse link
- Shows full submission details (album art, song info, all links)
- Can edit submission details
- Can go back to authoring or swap song

## API Endpoints

### Public/User Endpoints (`/api/community-events/`)

- `GET /` - List active community events
- `GET /{event_id}` - Get event details with participation status
- `POST /{event_id}/register` - Register interest in event
- `POST /{event_id}/add-song` - Add a new or existing song
- `PUT /{event_id}/swap-song` - Swap current song
- `DELETE /{event_id}/remove-song` - Remove song from event
- `POST /{event_id}/submit` - Submit completed song
- `PUT /{event_id}/update-submission` - Update submission details
- `GET /{event_id}/songs` - Get all songs in event
- `GET /{event_id}/registrations` - Get all registrations

### Admin Endpoints (`/api/admin/community-events/`)

- `GET /` - List all events (including ended)
- `POST /` - Create new event
- `PUT /{event_id}` - Update event
- `DELETE /{event_id}` - Delete event
- `POST /{event_id}/reveal` - Reveal all songs

## Frontend Components

### WIP Page Banner (`/components/wip/communityEvent/`)

- `CommunityEventBanner.js` - Main container with expand/collapse
- `EventBannerHeader.js` - Collapsible header with stats
- `EventBannerContent.js` - Routes to appropriate stage component
- `useCommunityEvent.js` - Custom hook for state management

### Stage Components (`/components/wip/communityEvent/stages/`)

- `StageNotRegistered.js` - Join event prompt
- `StageRegistered.js` - Add song UI with inline creation form
- `StageInProgress.js` - Embedded WipSongCard component
- `StageCompleted.js` - Submission form
- `StageSubmitted.js` - Submission confirmation with edit options

### Supporting Components

- `MoveSongToEvent.js` - Modal to select existing song (WIP/Future only)
- `SwapEventSong.js` - Three-step swap flow
- `RemoveEventSong.js` - Remove with pack selection for song destination
- `OtherSubmissions.js` - View other participants' songs

### Homepage Integration

- Event banner in homepage shows active events
- "Pick up where you left off" includes community event songs with special tag

## Visibility Rules

### Before Event Reveal

- Everyone can see: song titles, artists, albums, album art, usernames
- Everyone can see: general status ("In Progress", "Done", "Uploaded")
- Only song owner can see: RhythmVerse link, description, visualizer, preview
- Only song owner can see: exact workflow step progress

### After Event Reveal

- All submission details become visible to everyone
- Links become clickable for all users

## Technical Notes

### Workflow Completion Check

Uses `services/completion_service.py` helpers:

- `fetch_workflow_fields_map()` - Gets user's workflow steps via raw SQL
- `fetch_song_progress_map()` - Gets song progress via raw SQL

This avoids ORM model/database schema mismatches.

### Song Creation Flow

New songs in events use `create_song_in_db()` which:

1. Creates the song record
2. Auto-enhances with Spotify metadata
3. Creates workflow progress records
4. Cleans remaster tags from titles/albums

### Pack Filtering

"Move to Another Pack" and "Swap Song" modals:

- Fetch WIP and Future Plans songs
- Extract unique packs from those songs
- Exclude community event packs
- Sort alphabetically

## Admin Features

- Create/edit/delete community events
- Set event theme, description, banner image
- Set end date (optional - NULL means always open)
- Set RhythmVerse release time (displayed to users in CET)
- Reveal event to make all submissions public
- View all participants and their submission status

## Notifications

- All users receive a notification when a new community event starts
- Event appears in homepage banner section

---

## Work Completed

1. ✅ Database schema extensions for Pack and Song models
2. ✅ CommunityEventRegistration table
3. ✅ Backend API endpoints (public + admin)
4. ✅ Event service with participation tracking
5. ✅ Frontend WIP page banner with all stages
6. ✅ Inline song creation with Spotify enhancement
7. ✅ Move existing song modal (WIP/Future only)
8. ✅ Swap and remove song flows
9. ✅ Submission form with RhythmVerse link
10. ✅ Submission details view with edit capability
11. ✅ Other participants view
12. ✅ Homepage integration
13. ✅ Admin management page
14. ✅ RhythmVerse release time display
15. ✅ Workflow completion using user's custom workflow
16. ✅ Visibility rules (hidden until reveal)
17. ✅ Fireworks celebration on completion
18. ✅ "Continue to Submit" button (no auto-transition)
19. ✅ Banner image display with proper aspect ratio (1100×310)
20. ✅ Remaster tag cleaning on song creation
