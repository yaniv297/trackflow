/**
 * Unified progress utilities for the new workflow system
 * Single source of truth for all progress calculations
 */

/**
 * Get the completion status for a specific field in a song
 * Uses only the new progress system (song.progress)
 */
export const getFieldCompletion = (song, fieldName) => {
  if (!song.progress || typeof song.progress !== 'object') {
    return false;
  }
  return Boolean(song.progress[fieldName]);
};

/**
 * Calculate the number of completed fields for a song
 */
export const getCompletedFieldsCount = (song, workflowFields) => {
  if (!Array.isArray(workflowFields) || workflowFields.length === 0) {
    return 0;
  }
  
  return workflowFields.reduce((count, field) => {
    return count + (getFieldCompletion(song, field) ? 1 : 0);
  }, 0);
};

/**
 * Calculate completion percentage for a song
 */
export const getSongCompletionPercentage = (song, workflowFields) => {
  if (!Array.isArray(workflowFields) || workflowFields.length === 0) {
    return 0;
  }
  
  const completedCount = getCompletedFieldsCount(song, workflowFields);
  return Math.round((completedCount / workflowFields.length) * 100);
};

/**
 * Check if a song is fully complete
 */
export const isSongComplete = (song, workflowFields) => {
  if (!Array.isArray(workflowFields) || workflowFields.length === 0) {
    return false;
  }
  
  return workflowFields.every(field => getFieldCompletion(song, field));
};

/**
 * Get progress data for displaying in UI
 */
export const getSongProgressData = (song, workflowFields) => {
  const completedCount = getCompletedFieldsCount(song, workflowFields);
  const totalCount = workflowFields.length;
  const percentage = getSongCompletionPercentage(song, workflowFields);
  const isComplete = isSongComplete(song, workflowFields);
  
  return {
    completedCount,
    totalCount,
    percentage,
    isComplete,
    remaining: totalCount - completedCount
  };
};

/**
 * Update a song's progress for a specific field
 * Returns updated song object with new progress
 */
export const updateSongProgress = (song, fieldName, isCompleted) => {
  return {
    ...song,
    progress: {
      ...(song.progress || {}),
      [fieldName]: Boolean(isCompleted)
    }
  };
};

/**
 * Mark all fields as complete for a song
 */
export const markAllFieldsComplete = (song, workflowFields) => {
  const updatedProgress = { ...(song.progress || {}) };
  
  workflowFields.forEach(field => {
    updatedProgress[field] = true;
  });
  
  return {
    ...song,
    progress: updatedProgress
  };
};

/**
 * Get fields that are currently incomplete
 */
export const getIncompleteFields = (song, workflowFields) => {
  return workflowFields.filter(field => !getFieldCompletion(song, field));
};

/**
 * Get fields that are currently complete
 */
export const getCompleteFields = (song, workflowFields) => {
  return workflowFields.filter(field => getFieldCompletion(song, field));
};