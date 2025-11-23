/**
 * Spotify Features section content
 */
export const spotifyFeaturesContent = {
  title: "🎧 Spotify Features",
  sections: [
    {
      title: "Automatic Enhancement",
      type: "paragraph",
      content:
        "TrackFlow automatically enhances new songs with Spotify metadata, making data entry faster and more accurate.",
      subsections: [
        {
          title: "What Gets Enhanced",
          type: "list",
          content: [
            {
              label: "Album Information:",
              text: "Official album name and release year",
            },
            {
              label: "Cover Art:",
              text: "High-quality album artwork automatically downloaded",
            },
            {
              label: "Metadata:",
              text: "Correct artist names, featuring artists, and track details",
            },
            {
              label: "Title Cleaning:",
              text: "Removes remaster tags and extra text for cleaner titles",
            },
          ],
        },
        {
          title: "When It Happens",
          type: "list",
          content: [
            {
              label: "New Songs:",
              text: "Automatically when you create individual songs",
            },
            {
              label: "Pack Creation:",
              text: "All songs in new packs are enhanced automatically",
            },
            {
              label: "Spotify Import:",
              text: "Songs imported from playlists come pre-enhanced",
            },
          ],
        },
      ],
    },
    {
      title: "Manual Enhancement",
      type: "paragraph",
      content:
        "Sometimes you need to find better Spotify matches or enhance songs that weren't automatically processed.",
      subsections: [
        {
          title: "How to Enhance Manually",
          type: "steps",
          content: [
            'Click the "Enhance" button on any song',
            "TrackFlow searches Spotify for matches based on title and artist",
            "If multiple matches are found, you'll see a selection dialog",
            "Choose the best match from the list",
            "The song is updated with the selected Spotify data",
          ],
        },
        {
          title: "Spotify Playlist Import",
          type: "highlight-box",
          highlightColor: "#e7f3ff",
          borderColor: "#b3d9ff",
          content: {
            title: "Import Process",
            steps: [
              'Navigate to "Import from Spotify" in the main menu',
              "Paste a Spotify playlist URL",
              "Choose whether to create a new pack or add to existing pack",
              "All songs are imported with full Spotify metadata",
              "Songs are automatically enhanced with cover art and album information",
            ],
          },
        },
      ],
    },
  ],
};

