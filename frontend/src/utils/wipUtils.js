/**
 * Utility functions for WIP page
 */

// Utility function to capitalize artist and album names (keeping for compatibility)
// eslint-disable-next-line no-unused-vars
export const capitalizeName = (name) => {
  if (!name) return name;
  const words = name.split(" ");

  return words
    .map((word, index) => {
      // Handle special cases like "the", "of", "and", etc.
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
        "over",
        "under",
        "around",
        "near",
        "off",
        "out",
        "away",
        "down",
        "since",
        "until",
        "while",
        "although",
        "though",
        "if",
        "unless",
        "because",
        "as",
        "like",
        "than",
        "except",
        "but",
        "or",
        "nor",
        "so",
        "yet",
        "neither",
        "either",
        "both",
        "not",
        "no",
        "any",
        "some",
        "all",
        "each",
        "every",
        "most",
        "few",
        "many",
        "much",
        "more",
        "less",
        "little",
        "big",
        "small",
        "large",
        "great",
        "good",
        "bad",
        "new",
        "old",
        "young",
        "long",
        "short",
        "high",
        "low",
        "wide",
        "narrow",
      ];

      // Only lowercase these words if they're NOT the first word
      if (index > 0 && lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

