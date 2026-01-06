# Pack Rename Permissions Report

## Issue Summary

John (JohnSmith2007, ID: 77) reported that he cannot rename pack "Bowie Project 01 (Bonus)" to "Bowie Project 02", even though the rename option is visible to him.

## Database Query Results

### Pack Information

- **Pack ID**: 628
- **Pack Name**: "Bowie Project 02" (already renamed by owner)
- **Pack Owner**: yaniv297 (ID: 1)
- **Total Songs**: 8 songs

### John's Permissions on Pack 628

- **Is Pack Owner**: ❌ No
- **Owns Any Songs**: ❌ No
- **Has Pack-Level Collaboration**: ❌ No (0 collaborations found)
- **Has Song-Level Collaboration**: ❌ No (0 collaborations found)

### Songs in Pack 628

All 8 songs are owned by either:

- yaniv297 (ID: 1) - 6 songs
- User ID 2 - 2 songs ("DJ" and "Fashion")

**John owns 0 songs and has 0 collaborations on this pack.**

## Code Analysis

### Backend Permission Check

**File**: `backend/api/packs/services/pack_service.py`

- Line 29-33: `get_pack_by_id()` method checks `if pack.user_id != user_id` and raises 403 Forbidden
- **Result**: Only pack owners can update/rename packs
- Collaborators with `PACK_EDIT` permission are NOT allowed to rename

### Frontend UI Issues

#### Issue 1: Standalone Rename Button Always Shown

**File**: `frontend/src/components/pages/WipPackCard.js`

- **Lines 459-486**: Standalone rename button (✏️) is ALWAYS displayed
- **Problem**: No permission check before showing this button
- **Impact**: Non-owners see the button but get 403 error when trying to rename

#### Issue 2: Pack Settings Dropdown Has Permission Check

**File**: `frontend/src/components/pages/WipPackCard.js`

- **Lines 545-564**: Pack settings button (⚙️) correctly checks permissions:
  - Checks if user is pack owner (`song.pack_owner_id === user?.id`)
  - Checks if user has `PACK_EDIT` collaboration permission
- **Result**: This button is correctly hidden for non-authorized users

#### Issue 3: Backend Doesn't Support PACK_EDIT for Rename

**File**: `backend/api/packs/services/pack_service.py`

- Even if a user has `PACK_EDIT` collaboration permission, the backend still only allows pack owners to rename
- **Inconsistency**: Frontend checks for `PACK_EDIT` permission, but backend doesn't honor it

## Recommendations

### 1. Fix Frontend: Hide Rename Button for Non-Authorized Users

The standalone rename button (✏️) should use the same permission check as the pack settings button.

### 2. Consider Backend Enhancement (Optional)

If `PACK_EDIT` collaborators should be able to rename packs, update the backend to allow it:

- Modify `get_pack_by_id()` to check for `PACK_EDIT` collaboration
- Or create a separate permission check method for pack updates

### 3. Current State

- John has NO collaborations on pack 628
- Even if John had `PACK_EDIT` permission, the backend would still reject the rename
- The frontend shows the rename button incorrectly

## Fixes Applied

### Fix 1: Hide Standalone Rename Button in WipPackCard

**File**: `frontend/src/components/pages/WipPackCard.js`

- **Lines 458-486**: Added permission check wrapper around the standalone rename button (✏️)
- **Logic**: Uses the same permission check as the pack settings button:
  - Checks if user is pack owner (`song.pack_owner_id === user?.id`)
  - Checks if user has `PACK_EDIT` collaboration permission
- **Result**: Rename button is now hidden for users without permission

### Fix 2: Hide Rename Option in PackHeader Dropdown

**File**: `frontend/src/components/navigation/PackHeader.js`

- **Lines 359-369**: Added permission check around "Edit Pack Name" option inside the dropdown
- **Logic**: Same permission check as the dropdown itself:
  - Checks if user owns any songs in the pack (`song.user_id === user?.id`)
  - Checks if user has `PACK_EDIT` collaboration (`song.pack_collaboration.can_edit === true`)
- **Result**: Even if dropdown is visible (e.g., for pack_view users), rename option is hidden for non-authorized users

### Other Components Status

- **Backend**: Currently only allows pack owners to rename (not `PACK_EDIT` collaborators)

## Conclusion

The rename button was shown to users who don't have permission to rename, causing confusion. The button is now hidden for non-owners. Note: Even if a user has `PACK_EDIT` permission, the backend currently only allows pack owners to rename. If `PACK_EDIT` collaborators should be able to rename, the backend would need to be updated to support this.
