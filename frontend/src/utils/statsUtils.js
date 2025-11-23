/**
 * Utility functions for stats page
 */

/**
 * Filter out empty/null packs from top packs list
 */
export const filterTopPacks = (topPacks) => {
  return (topPacks || []).filter((p) => p.pack && p.pack !== "(none)");
};

