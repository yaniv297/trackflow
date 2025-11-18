/**
 * Utility functions for YARG song.ini file generation
 */

/**
 * Generates a YARG song.ini file content from Trackflow song metadata
 * @param {Object} song - Song object from Trackflow
 * @param {Object} user - Current user object (contains username)
 * @param {Array} collaborations - Array of WIP collaborations for the song
 * @returns {string} - INI file content
 */
export function generateYargIni(song, user = null, collaborations = []) {
  // Helper function to escape values for INI format
  const escapeIniValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  // Helper function to map field names to charter fields using fuzzy matching
  const getCharterFieldName = (fieldName) => {
    if (!fieldName) return null;
    
    const field = fieldName.toLowerCase().trim();
    
    // Guitar variations
    if (field.includes('guitar') && !field.includes('bass')) {
      if (field.includes('rhythm')) return 'charter_rhythm';
      return 'charter_guitar';
    }
    
    // Bass variations
    if (field.includes('bass')) {
      return 'charter_bass';
    }
    
    // Drums variations
    if (field.includes('drum')) {
      return 'charter_drums';
    }
    
    // Keys/Keyboard variations
    if (field.includes('key') || field.includes('piano') || field.includes('synth')) {
      return 'charter_keys';
    }
    
    // Vocals variations
    if (field.includes('vocal') || field.includes('sing') || field.includes('voice')) {
      return 'charter_vocals';
    }
    
    return null;
  };

  // Create collaboration lookup using fuzzy matching
  const collabLookup = {};
  collaborations.forEach((collab) => {
    const charterField = getCharterFieldName(collab.field);
    if (charterField) {
      collabLookup[charterField] = collab.collaborator;
    }
  });

  // Helper function to get charter name for a field
  const getCharterName = (fieldKey) => {
    // First check if there's a collaborator assigned to this specific field
    if (collabLookup[fieldKey]) {
      return collabLookup[fieldKey];
    }
    // Otherwise, use the song owner's username if available
    if (user?.username) {
      return user.username;
    }
    return "";
  };

  // Map Trackflow fields to YARG INI format
  const iniContent = `[song]
name = ${escapeIniValue(song.title)}
artist = ${escapeIniValue(song.artist)}
album = ${escapeIniValue(song.album)}
album_track = 
year = ${escapeIniValue(song.year)}
genre = 
sub_genre = 
tags = 
location = 
rating = 
song_length = 
icon = 
playlist = 
playlist_track = 
parts_vocals_harm = 
modchart = 0
preview_start_time = 
loading_phrase = 
charter = ${getCharterName("charter")}
charter_guitar = ${getCharterName("charter_guitar")}
charter_rhythm = ${getCharterName("charter_rhythm")}
charter_bass = ${getCharterName("charter_bass")}
charter_drums = ${getCharterName("charter_drums")}
charter_keys = ${getCharterName("charter_keys")}
charter_vocals = ${getCharterName("charter_vocals")}
charter_lower_diff = ${getCharterName("charter_lower_diff")} 
credit_album_art_by = 
credit_arranged_by = 
credit_composed_by = 
credit_courtesy_of = 
credit_engineered_by = 
credit_license = 
credit_mastered_by = 
credit_mixed_by = 
credit_performed_by = 
credit_produced_by = 
credit_published_by = 
credit_written_by = 
credit_other = 
link_bandcamp = 
link_bluesky = 
link_facebook = 
link_instagram = 
link_newgrounds = 
link_soundcloud = 
link_spotify = 
link_tiktok = 
link_twitter = 
link_youtube = 
link_other = 
diff_band = 
diff_guitar = 
diff_guitarghl = 
diff_guitar_coop = 
diff_guitar_coop_ghl = 
diff_rhythm = 
diff_rhythm_ghl = 
diff_bass = 
diff_bassghl = 
diff_drums = 
diff_drums_real = 
diff_elite_drums = 
diff_keys = 
diff_keys_real = 
diff_vocals = 
diff_vocals_harm = 
diff_dance = 
pro_drums = 
five_lane_drums = 
vocal_scroll_speed = 
video_start_time = 
end_events = 0`;

  return iniContent;
}

/**
 * Downloads the generated INI file
 * @param {string} content - INI file content
 * @param {string} filename - Filename for download
 */
export function downloadIniFile(content, filename = "song.ini") {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a YARG ini file for a song
 * @param {Object} song - Song object from Trackflow
 * @param {Object} user - Current user object (contains username)
 * @param {Array} collaborations - Array of WIP collaborations for the song
 */
export function exportYargIni(song, user = null, collaborations = []) {
  const iniContent = generateYargIni(song, user, collaborations);
  const filename = `${song.artist} - ${song.title}.ini`.replace(
    /[<>:"/\\|?*]/g,
    "_"
  );
  downloadIniFile(iniContent, filename);
}
