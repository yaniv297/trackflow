/**
 * Unified progress utilities for the new workflow system
 * Single source of truth for all progress calculations
 * 
 * IMPORTANT: Irrelevant steps (marked as N/A for specific songs) are excluded
 * from all completion calculations. This allows accurate tracking for songs
 * that don't have all instruments (e.g., no Keys/Pro Keys).
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
 * Check if a field is marked as irrelevant (N/A) for a specific song
 */
export const isFieldIrrelevant = (song, fieldName) => {
  if (!song.irrelevantSteps || !Array.isArray(song.irrelevantSteps)) {
    return false;
  }
  return song.irrelevantSteps.includes(fieldName);
};

/**
 * Get relevant workflow fields for a song (excludes irrelevant ones)
 */
export const getRelevantFields = (song, workflowFields) => {
  if (!Array.isArray(workflowFields)) {
    return [];
  }
  return workflowFields.filter(field => !isFieldIrrelevant(song, field));
};

/**
 * Calculate the number of completed fields for a song
 * Only counts relevant (non-irrelevant) fields
 */
export const getCompletedFieldsCount = (song, workflowFields) => {
  if (!Array.isArray(workflowFields) || workflowFields.length === 0) {
    return 0;
  }
  
  const relevantFields = getRelevantFields(song, workflowFields);
  return relevantFields.reduce((count, field) => {
    return count + (getFieldCompletion(song, field) ? 1 : 0);
  }, 0);
};

/**
 * Calculate completion percentage for a song
 * Irrelevant steps are excluded from both numerator and denominator
 */
export const getSongCompletionPercentage = (song, workflowFields) => {
  if (!Array.isArray(workflowFields) || workflowFields.length === 0) {
    return 0;
  }
  
  const relevantFields = getRelevantFields(song, workflowFields);
  if (relevantFields.length === 0) {
    return 0;
  }
  
  const completedCount = getCompletedFieldsCount(song, workflowFields);
  return Math.round((completedCount / relevantFields.length) * 100);
};

/**
 * Check if a song is fully complete
 * Only checks relevant (non-irrelevant) fields
 */
export const isSongComplete = (song, workflowFields) => {
  if (!Array.isArray(workflowFields) || workflowFields.length === 0) {
    return false;
  }
  
  const relevantFields = getRelevantFields(song, workflowFields);
  if (relevantFields.length === 0) {
    return false;
  }
  
  return relevantFields.every(field => getFieldCompletion(song, field));
};

/**
 * Get progress data for displaying in UI
 * Includes both total and relevant step counts
 */
export const getSongProgressData = (song, workflowFields) => {
  const relevantFields = getRelevantFields(song, workflowFields);
  const completedCount = getCompletedFieldsCount(song, workflowFields);
  const totalCount = relevantFields.length;
  const percentage = getSongCompletionPercentage(song, workflowFields);
  const isComplete = isSongComplete(song, workflowFields);
  const irrelevantCount = (workflowFields?.length || 0) - totalCount;
  
  return {
    completedCount,
    totalCount,
    percentage,
    isComplete,
    remaining: totalCount - completedCount,
    irrelevantCount, // Number of steps marked as N/A
    totalWorkflowSteps: workflowFields?.length || 0, // Total steps before filtering
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
 * Only marks relevant (non-irrelevant) fields
 */
export const markAllFieldsComplete = (song, workflowFields) => {
  const updatedProgress = { ...(song.progress || {}) };
  const relevantFields = getRelevantFields(song, workflowFields);
  
  relevantFields.forEach(field => {
    updatedProgress[field] = true;
  });
  
  return {
    ...song,
    progress: updatedProgress
  };
};

/**
 * Get fields that are currently incomplete
 * Only returns relevant (non-irrelevant) fields
 */
export const getIncompleteFields = (song, workflowFields) => {
  const relevantFields = getRelevantFields(song, workflowFields);
  return relevantFields.filter(field => !getFieldCompletion(song, field));
};

/**
 * Get fields that are currently complete
 * Only returns relevant (non-irrelevant) fields
 */
export const getCompleteFields = (song, workflowFields) => {
  const relevantFields = getRelevantFields(song, workflowFields);
  return relevantFields.filter(field => getFieldCompletion(song, field));
};

/**
 * Update a song's irrelevant steps
 * Returns updated song object with new irrelevantSteps
 */
export const updateSongIrrelevantSteps = (song, irrelevantSteps) => {
  return {
    ...song,
    irrelevantSteps: Array.isArray(irrelevantSteps) ? [...irrelevantSteps] : []
  };
};