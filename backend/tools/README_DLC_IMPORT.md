# Rock Band DLC Import System

This system allows you to import official Rock Band DLC data from Google Sheets and check if songs are already available as official content.

## Setup

### 1. Create the Database Table

First, create the `rock_band_dlc` table in your database:

```bash
cd trackflow/backend/tools
python create_dlc_table.py
```

### 2. Import DLC Data

Import the Rock Band DLC data from the Google Sheet:

```bash
cd trackflow/backend/tools
python test_dlc_import.py
```

This will:

- Download the Google Sheet as CSV
- Parse the data (extracting Song, Artist, and Origin columns)
- Import unique entries to the database
- Show statistics about the import

## API Endpoints

Once imported, you can use these API endpoints:

### Check DLC Status

```
GET /rockband-dlc/check?title={song_title}&artist={artist_name}
```

Returns:

```json
{
  "is_dlc": true,
  "origin": "RB1",
  "match_type": "exact",
  "dlc_entry": {
    "id": 123,
    "title": "Song Title",
    "artist": "Artist Name",
    "origin": "RB1"
  }
}
```

### Search DLC

```
GET /rockband-dlc/search?q={query}&limit=10
```

### Get DLC Statistics

```
GET /rockband-dlc/stats
```

## Frontend Integration

The system includes a `DLCWarning` component that can be added to song creation forms:

```jsx
import DLCWarning from "./components/DLCWarning";

// In your song creation form
<DLCWarning title={form.title} artist={form.artist} />;
```

This will automatically check if the song is already official DLC and show a warning if it is.

## Database Schema

The `rock_band_dlc` table contains:

- `id` - Primary key
- `title` - Song title
- `artist` - Artist name
- `origin` - Where the song comes from (RB1, RB2, DLC, Beatles, etc.)
- `linked_song_id` - Optional link to songs in your database
- `created_at` - When the entry was created

## Usage Examples

### Check if a song is DLC

```javascript
import { checkDLCStatus } from "../utils/dlcCheck";

const status = await checkDLCStatus("Hey Jude", "The Beatles");
if (status.is_dlc) {
  console.log(`This song is from ${status.origin}`);
}
```

### Search for DLC

```javascript
import { searchDLC } from "../utils/dlcCheck";

const results = await searchDLC("Beatles", 5);
console.log(`Found ${results.count} Beatles songs in DLC`);
```

## Origin Values

The system recognizes these origin values:

- `RB1` - Rock Band 1
- `RB2` - Rock Band 2
- `RB3` - Rock Band 3
- `RB4` - Rock Band 4
- `DLC` - Downloadable Content
- `Beatles` - The Beatles: Rock Band
- `Green Day` - Green Day: Rock Band
- `Lego` - Lego Rock Band

## Benefits

1. **Avoid Duplicates** - Users get warned when creating songs that are already official DLC
2. **Better Planning** - Know which songs are already available in the game
3. **Reference Data** - Complete database of all official Rock Band content
4. **Smart Matching** - Finds both exact and partial matches

## Maintenance

To update the DLC database with new data:

1. Update the Google Sheet
2. Run the import script again (it will skip duplicates)
3. The system will automatically handle new entries

The import is designed to be idempotent - running it multiple times won't create duplicates.
