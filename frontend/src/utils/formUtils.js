/**
 * Utility functions for forms
 */

// Detect initialisms like P.S., U.S.A., D.J.
const isInitialism = (word) => /^([A-Za-z]\.)+[A-Za-z]?$/.test(word);

// Capitalize a word, handling leading punctuation and initialisms
const capitalizeWord = (word) => {
  // Preserve initialisms as uppercase
  if (isInitialism(word)) {
    return word.toUpperCase();
  }
  // Find the first alphabetic character and capitalize it
  const match = word.match(/^([^a-zA-Z]*)([a-zA-Z])(.*)$/);
  if (match) {
    const [, prefix, firstLetter, rest] = match;
    return prefix + firstLetter.toUpperCase() + rest.toLowerCase();
  }
  return word;
};

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
      // Only lowercase these words if they're NOT the first word AND not after punctuation
      const startsAfterPunctuation = /^[(\["']/.test(word);
      if (index > 0 && !startsAfterPunctuation && lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return capitalizeWord(word);
    })
    .join(" ");
};

/**
 * Simple capitalize function (used in NewSongForm)
 */
export const simpleCapitalize = (str) =>
  str
    .split(" ")
    .map((word) => capitalizeWord(word))
    .join(" ");

