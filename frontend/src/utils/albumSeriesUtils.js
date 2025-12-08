/**
 * Utility functions for album series
 */

import { getSongCompletionPercentage } from "./progressUtils";

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

export const calculateSeriesCompletion = (series, seriesDetails, authoringFields, userWorkflowFields = {}) => {
  if (series.status !== "in_progress") return null;

  // Get songs for this series (both album songs and bonus songs, but exclude optional songs)
  const albumSongs = seriesDetails[series.id]?.album_songs || [];
  const bonusSongs = seriesDetails[series.id]?.bonus_songs || [];
  const allSongs = [...albumSongs, ...bonusSongs];
  const coreSongs = allSongs.filter((song) => !song.optional);

  if (coreSongs.length === 0) return 0;

  // Calculate pack completion as average of each song's completion percentage
  // Each song's completion is relative to its owner's workflow (like WIP page)
  let totalPercent = 0;
  coreSongs.forEach((song) => {
    // Get workflow fields for this song's owner
    const songOwnerFields = song.user_id && userWorkflowFields[song.user_id]
      ? userWorkflowFields[song.user_id]
      : authoringFields; // Fallback to current user's workflow if owner's not available
    
    if (!songOwnerFields || songOwnerFields.length === 0) {
      return; // Skip if no workflow fields
    }
    
    const songPercent = getSongCompletionPercentage(song, songOwnerFields);
    totalPercent += songPercent;
  });

  return coreSongs.length > 0
    ? Math.round(totalPercent / coreSongs.length)
    : 0;
};

export const calculateSongCompletion = (song, authoringFields, userWorkflowFields = {}) => {
  // Get workflow fields for this song's owner (like WIP page)
  const songOwnerFields = song.user_id && userWorkflowFields[song.user_id]
    ? userWorkflowFields[song.user_id]
    : authoringFields; // Fallback to current user's workflow if owner's not available
  
  // Use the exact same function as WIP page
  return getSongCompletionPercentage(song, songOwnerFields);
};

