/**
 * Utility functions for forms
 */

/**
 * Capitalize artist and album names with proper handling of common words
 */
export const capitalizeName = (name) => {
  if (!name) return name;
  const words = name.split(" ");

  const lowerWords = [
    "the",
    "of",
    "and",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "among",
    "within",
    "without",
    "against",
    "toward",
    "towards",
    "upon",
    "across",
    "behind",
    "beneath",
    "beside",
    "beyond",
    "inside",
    "outside",
    "under",
    "over",
    "along",
    "around",
    "down",
    "off",
    "out",
    "away",
    "back",
    "forward",
    "backward",
    "upward",
    "downward",
    "inward",
    "outward",
    "northward",
    "southward",
    "eastward",
    "westward",
    "homeward",
    "heavenward",
    "earthward",
    "seaward",
    "landward",
    "leeward",
    "windward",
    "leftward",
    "rightward",
  ];

  return words
    .map((word, index) => {
      // Only lowercase these words if they're NOT the first word
      if (index > 0 && lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

/**
 * Simple capitalize function (used in NewSongForm)
 */
export const simpleCapitalize = (str) =>
  str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

