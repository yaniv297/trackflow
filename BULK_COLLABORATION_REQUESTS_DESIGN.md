# Bulk Collaboration Requests + Full Pack Permissions - Design Document

## Overview

This document outlines the implementation of bulk collaboration requests and optional full pack permissions for TrackFlow.

## Feature Summary

### 1. Bulk Collaboration Requests
- Users can select multiple songs from **the same owner** and send a single batch request
- Strict enforcement: cannot send one request to multiple target users
- Batch lifecycle: PENDING → APPROVED/REJECTED/PARTIALLY_APPROVED/CANCELLED

### 2. Recipient Experience
- Incoming requests appear grouped as a single item ("User X requested collaboration on 6 songs")
- Primary actions: **Approve All** / **Reject All**
- Expandable section for selective per-song decisions
- Final status per batch reflects decisions made

### 3. Full Pack Permissions Option
- When approving, checkbox option: "Grant Full Pack Permissions"
- If checked, grants access to entire pack(s) instead of just requested songs
- Clear UI messaging about what permissions will be granted

### 4. Notifications
- Clear notification indicating exactly what was approved:
  - "Approved: 6 songs" OR "Approved: Full pack access for 'Pack Name'"
  - Partial approval shows counts + optionally lists rejected songs

---

## Data Model Changes

### New Table: `collaboration_request_batches`

```sql
CREATE TABLE collaboration_request_batches (
    id INTEGER PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id),
    target_user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, partially_approved, cancelled
    grant_full_pack_permissions BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    response_message TEXT,
    
    -- Indexes
    INDEX idx_batch_requester (requester_id),
    INDEX idx_batch_target (target_user_id),
    INDEX idx_batch_status (status),
    INDEX idx_batch_created (created_at)
);
```

### Updated Table: `collaboration_requests`

Add new columns:
```sql
ALTER TABLE collaboration_requests ADD COLUMN batch_id INTEGER REFERENCES collaboration_request_batches(id);
ALTER TABLE collaboration_requests ADD COLUMN item_status VARCHAR(20);  -- pending, approved, rejected (per-song status)
CREATE INDEX idx_collab_req_batch ON collaboration_requests(batch_id);
```

### Permission Changes

When `grant_full_pack_permissions = TRUE`:
- Instead of creating `Collaboration(song_id=X)` entries
- Create `Collaboration(pack_id=Y, collaboration_type=PACK_EDIT)` entries
- This grants access to ALL songs in the pack

---

## API Endpoints

### Create Batch Request

```
POST /api/collaboration-requests/batch
```

**Request:**
```json
{
  "song_ids": [1, 2, 3, 4, 5],
  "message": "I'd love to collaborate on these songs..."
}
```

**Validation:**
- All songs must be owned by the same user
- All songs must be public
- No existing pending requests for any of these songs from this user

**Response:**
```json
{
  "batch_id": 1,
  "song_count": 5,
  "target_user_id": 42,
  "target_username": "songowner",
  "status": "pending",
  "songs": [...]
}
```

### Get Received Batches (for recipient)

```
GET /api/collaboration-requests/batches/received?status=pending
```

**Response:**
```json
{
  "batches": [
    {
      "batch_id": 1,
      "requester_id": 10,
      "requester_username": "requester",
      "requester_display_name": "The Requester",
      "message": "...",
      "status": "pending",
      "created_at": "...",
      "songs": [
        {
          "request_id": 1,
          "song_id": 1,
          "song_title": "...",
          "song_artist": "...",
          "song_status": "Future Plans",
          "item_status": "pending",
          "pack_id": 5,
          "pack_name": "My Pack"
        },
        ...
      ],
      "packs_involved": [
        {"pack_id": 5, "pack_name": "My Pack", "song_count": 3},
        {"pack_id": 8, "pack_name": "Other Pack", "song_count": 2}
      ]
    }
  ]
}
```

### Respond to Batch

```
PUT /api/collaboration-requests/batches/{batch_id}/respond
```

**Request - Approve All:**
```json
{
  "action": "approve_all",
  "response_message": "Welcome aboard!",
  "grant_full_pack_permissions": true
}
```

**Request - Reject All:**
```json
{
  "action": "reject_all",
  "response_message": "Not looking for collaborators right now"
}
```

**Request - Selective:**
```json
{
  "action": "selective",
  "response_message": "Accepted some of your requests",
  "decisions": {
    "1": "approved",
    "2": "approved", 
    "3": "rejected",
    "4": "approved",
    "5": "rejected"
  },
  "grant_full_pack_permissions": false
}
```

### Get Sent Batches (for requester)

```
GET /api/collaboration-requests/batches/sent?status=pending
```

### Cancel Batch

```
DELETE /api/collaboration-requests/batches/{batch_id}
```

---

## Backend Implementation

### New Files

```
backend/api/collaboration_requests/
├── __init__.py
├── repositories/
│   ├── __init__.py
│   └── batch_repository.py
├── services/
│   ├── __init__.py
│   └── batch_service.py
├── routes/
│   ├── __init__.py
│   └── batch_routes.py
└── validators/
    ├── __init__.py
    └── batch_validators.py
```

### Key Service Methods

```python
class CollaborationBatchService:
    def create_batch(self, requester_id: int, song_ids: List[int], message: str) -> BatchResponse:
        """
        Create a batch request.
        - Validates all songs owned by same user
        - Validates all songs are public
        - Prevents duplicate pending requests
        """
        
    def respond_to_batch(
        self,
        batch_id: int,
        owner_id: int,
        action: str,  # "approve_all", "reject_all", "selective"
        response_message: str,
        decisions: Optional[Dict[int, str]] = None,
        grant_full_pack_permissions: bool = False
    ) -> BatchResponseResult:
        """
        Process response to batch request.
        - Creates collaboration entries
        - Handles full pack permissions if requested
        - Sends appropriate notifications
        """
        
    def grant_pack_permissions(self, pack_ids: List[int], user_id: int):
        """
        Grant PACK_EDIT permissions for specified packs.
        Additive - doesn't remove existing permissions.
        """
```

### Notification Types

Add new notification types:
```python
class NotificationType(str, enum.Enum):
    # ... existing ...
    COLLABORATION_BATCH_REQUEST = "collaboration_batch_request"
    COLLABORATION_BATCH_RESPONSE = "collaboration_batch_response"
```

### Notification Messages

**For recipient (new batch request):**
```
Title: "New Collaboration Request"
Message: "{requester} wants to collaborate on {count} songs"
```

**For requester (batch approved - songs only):**
```
Title: "Collaboration Request Approved ✅"
Message: "{owner} approved your request for {count} songs"
```

**For requester (batch approved - full pack):**
```
Title: "Collaboration Request Approved ✅"  
Message: "{owner} granted you full pack access to '{pack_name}'"
```

**For requester (partially approved):**
```
Title: "Collaboration Request Partially Approved"
Message: "{owner} approved {approved_count} of {total_count} songs (expand to see details)"
```

---

## Frontend Implementation

### Multi-Select UI (PublicSongsTableNew)

**State Management:**
```javascript
const [selectedSongs, setSelectedSongs] = useState([]); // [{id, owner_id, ...}]
const [selectionOwner, setSelectionOwner] = useState(null); // Current selection owner

const handleSongSelect = (song) => {
  if (selectedSongs.length === 0) {
    // First selection - set the owner
    setSelectionOwner(song.user_id);
    setSelectedSongs([song]);
  } else if (song.user_id === selectionOwner) {
    // Same owner - toggle selection
    toggleSelection(song);
  } else {
    // Different owner - show warning and clear
    showWarning("You can only select songs from one author at a time");
    setSelectedSongs([song]);
    setSelectionOwner(song.user_id);
  }
};
```

**UI Elements:**
- Checkbox on each song row (disabled for own songs)
- Selection indicator: "3 songs selected from @username"
- "Send Batch Request" button (appears when 2+ selected)
- "Clear Selection" button

### Batch Request Modal

```javascript
const BatchCollaborationRequestModal = ({ songs, onClose, onSuccess }) => {
  // Shows all selected songs
  // Single message input for the batch
  // "Send Request" button
};
```

### Inbox View (CollaborationRequestsPage)

**Grouped Display:**
```javascript
// Group requests by batch_id
const groupedBatches = useMemo(() => {
  const batches = {};
  receivedRequests.forEach(req => {
    const batchId = req.batch_id || `single_${req.id}`;
    if (!batches[batchId]) {
      batches[batchId] = { ...req, songs: [] };
    }
    batches[batchId].songs.push(req);
  });
  return Object.values(batches);
}, [receivedRequests]);
```

**Batch Card Component:**
```javascript
const BatchRequestCard = ({ batch }) => {
  const [expanded, setExpanded] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [grantFullPackPermissions, setGrantFullPackPermissions] = useState(false);
  
  return (
    <div className="batch-card">
      <div className="batch-header">
        <h3>{batch.requester_username} wants to collaborate on {batch.songs.length} songs</h3>
        <span className="time">{formatTimeAgo(batch.created_at)}</span>
      </div>
      
      <div className="batch-message">{batch.message}</div>
      
      {/* Pack info if songs span multiple packs */}
      {batch.packs_involved?.length > 0 && (
        <div className="packs-info">
          Involves: {batch.packs_involved.map(p => p.pack_name).join(', ')}
        </div>
      )}
      
      {/* Primary actions */}
      <div className="batch-actions">
        <button onClick={() => handleApproveAll()}>Approve All</button>
        <button onClick={() => handleRejectAll()}>Reject All</button>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse' : 'Review Individually'}
        </button>
      </div>
      
      {/* Full pack permissions checkbox */}
      <label className="pack-permissions-checkbox">
        <input 
          type="checkbox" 
          checked={grantFullPackPermissions}
          onChange={(e) => setGrantFullPackPermissions(e.target.checked)}
        />
        Grant Full Pack Permissions 
        <span className="help-text">
          (Grants access to all songs in {batch.packs_involved?.map(p => p.pack_name).join(' and ')})
        </span>
      </label>
      
      {/* Expanded per-song decisions */}
      {expanded && (
        <div className="song-decisions">
          {batch.songs.map(song => (
            <div key={song.request_id} className="song-decision-row">
              <SongInfo song={song} />
              <select 
                value={decisions[song.request_id] || 'pending'}
                onChange={(e) => setDecision(song.request_id, e.target.value)}
              >
                <option value="pending">Undecided</option>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
          ))}
          <button onClick={() => handleSubmitDecisions()}>
            Apply Decisions
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## Edge Cases & Rules

### 1. Strict Same-Owner Enforcement
- Batch creation MUST fail if song_ids belong to different owners
- Frontend prevents selection across owners with clear messaging

### 2. Duplicate Prevention
- If user has ANY pending request for a song, that song cannot be included in a new batch
- API returns clear error listing the conflicting songs

### 3. Race Conditions
- Approving twice should be idempotent (check if already approved)
- Use database transactions for batch operations

### 4. Invalid Songs
- If a song in batch becomes invalid (deleted/made private) between request and approval:
  - Skip that song
  - Show message explaining what was skipped
  - Continue with valid songs

### 5. Additive Permissions
- New approvals never remove existing permissions
- If user already has song_edit, adding pack_edit doesn't remove it
- Pack permission implies access to all current AND future songs in pack

### 6. Audit Trail
- Log all batch operations in activity_logs
- Include: who, what, when, which songs, pack permissions granted

---

## Migration Strategy

### Phase 1: Database Migration
1. Create `collaboration_request_batches` table
2. Add `batch_id` column to `collaboration_requests`
3. Add `item_status` column to `collaboration_requests`
4. Backfill existing single requests with NULL batch_id (treated as single-item batches)

### Phase 2: Backend API
1. Add new batch endpoints
2. Keep existing single-request endpoints working (backwards compatibility)
3. Single requests can be created as batch with 1 item OR via old endpoint

### Phase 3: Frontend
1. Add multi-select capability
2. Add batch request modal
3. Update inbox to show grouped batches
4. Maintain support for single requests in UI

---

## Testing Checklist

- [ ] Same-owner enforcement on batch creation
- [ ] Approve all functionality
- [ ] Reject all functionality
- [ ] Selective per-song decisions
- [ ] Full pack permissions grant
- [ ] Notification content correctness
- [ ] Permission checks after approval (song access, pack access)
- [ ] Duplicate request prevention
- [ ] Race condition handling
- [ ] Invalid song handling
- [ ] Backwards compatibility with single requests
- [ ] Activity logging

