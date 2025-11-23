/**
 * Songs & Packs section content
 */
export const songsAndPacksContent = {
  title: "🎵 Songs & Packs",
  sections: [
    {
      title: "Understanding Songs",
      type: "paragraph",
      content:
        "Songs are individual tracks in your authoring pipeline. Each song has a title, artist, and belongs to a pack.",
      subsections: [
        {
          title: "Creating Songs",
          type: "list",
          content: [
            {
              label: "Single Song:",
              text: 'Use "New +" → "New Song" for individual tracks',
            },
            {
              label: "Bulk Creation:",
              text: 'Use "New +" → "New Pack" to create multiple songs at once',
            },
            {
              label: "Spotify Import:",
              text: 'Use "Import from Spotify" to import entire playlists',
            },
          ],
        },
        {
          title: "Song Properties",
          type: "list",
          content: [
            {
              label: "Basic Info:",
              text: "Title, Artist, Album, Year",
            },
            {
              label: "Pack Assignment:",
              text: "Which collection the song belongs to",
            },
            {
              label: "Status:",
              text: "Future Plans, In Progress, or Released",
            },
            {
              label: "Optional/Required:",
              text: "Mark songs as optional for pack completion",
            },
            {
              label: "Cover Art:",
              text: "Automatically fetched from Spotify",
            },
          ],
        },
      ],
    },
    {
      title: "Understanding Packs",
      type: "paragraph",
      content:
        "Packs are collections of related songs, typically representing albums, artist discographies, or themed compilations.",
      subsections: [
        {
          title: "Pack Features",
          type: "list",
          content: [
            {
              label: "Organization:",
              text: "Group songs by album, artist, or theme",
            },
            {
              label: "Progress Tracking:",
              text: "See completion percentage across all songs",
            },
            {
              label: "Bulk Operations:",
              text: "Release entire packs when complete",
            },
            {
              label: "Collaboration:",
              text: "Share entire packs with other authors",
            },
            {
              label: "Album Series:",
              text: "Convert packs to album series if they center on a specific album",
            },
          ],
        },
        {
          title: "Pack Management",
          type: "list",
          content: [
            {
              label: "Create:",
              text: "When adding songs, specify pack name (creates if doesn't exist)",
            },
            {
              label: "Rename:",
              text: "Click pack name to edit",
            },
            {
              label: "Release:",
              text: "Move completed songs to Released status",
            },
            {
              label: "Move to Future:",
              text: "Send entire packs back to planning stage",
            },
            {
              label: "Delete:",
              text: "Remove packs and all contained songs",
            },
          ],
        },
      ],
    },
    {
      title: "Song Editing & Management",
      type: "info-box",
      content: {
        items: [
          {
            title: "Quick Edit",
            description:
              "Click any song field to edit in-place. Changes save automatically.",
          },
          {
            title: "Spotify Enhancement",
            description:
              'Click "Enhance" to search Spotify for better metadata, album art, and release year. Choose from multiple matches if available.',
          },
          {
            title: "Optional Songs",
            description:
              'Mark songs as "optional" - these don\'t count toward pack completion but can still be worked on. Useful for bonus tracks or alternate versions.',
          },
        ],
      },
    },
  ],
};

