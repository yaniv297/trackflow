/**
 * Utility functions for album series
 */

export const getStatusColor = (status) => {
  switch (status) {
    case "released":
      return "#4CAF50";
    case "in_progress":
      return "#FF9800";
    case "planned":
      return "#2196F3";
    default:
      return "#757575";
  }
};

export const getStatusText = (status) => {
  switch (status) {
    case "released":
      return "Released";
    case "in_progress":
      return "In Progress";
    case "planned":
      return "Planned";
    default:
      return status;
  }
};

export const getAuthorsForSong = (song) => {
  const authors = [];
  if (song.author) {
    authors.push(song.author);
  }
  if (song.collaborations) {
    song.collaborations.forEach((collab) => {
      if (collab.author && !authors.includes(collab.author)) {
        authors.push(collab.author);
      }
    });
  }
  return authors;
};

const AUTHORING_FIELDS = [
  "demucs",
  "midi",
  "tempo_map",
  "fake_ending",
  "drums",
  "bass",
  "guitar",
  "vocals",
  "harmonies",
  "pro_keys",
  "keys",
  "animations",
  "drum_fills",
  "overdrive",
  "compile",
];

export const calculateSeriesCompletion = (series, seriesDetails) => {
  if (series.status !== "in_progress") return null;

  // Get songs for this series (both album songs and bonus songs, but exclude optional songs)
  const albumSongs = seriesDetails[series.id]?.album_songs || [];
  const bonusSongs = seriesDetails[series.id]?.bonus_songs || [];
  const allSongs = [...albumSongs, ...bonusSongs];
  const coreSongs = allSongs.filter((song) => !song.optional);

  if (coreSongs.length === 0) return 0;

  const totalParts = coreSongs.length * AUTHORING_FIELDS.length;
  const filledParts = coreSongs.reduce((acc, song) => {
    return (
      acc + AUTHORING_FIELDS.filter((field) => song.authoring?.[field]).length
    );
  }, 0);

  return totalParts > 0 ? Math.round((filledParts / totalParts) * 100) : 0;
};

export const calculateSongCompletion = (song) => {
  const filledParts = AUTHORING_FIELDS.filter(
    (field) => song.authoring?.[field]
  ).length;
  return filledParts > 0
    ? Math.round((filledParts / AUTHORING_FIELDS.length) * 100)
    : 0;
};

