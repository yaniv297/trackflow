/**
 * Album Series section content
 */
export const albumSeriesContent = {
  title: "📀 Album Series",
  sections: [
    {
      title: "What Is The Album Series?",
      type: "paragraph",
      content:
        "The Album Series is a collaborative community project where members contribute album-centric packs. Only album series releases get official series numbers and appear on the public Album Series page for everyone to see.",
      subsections: [
        {
          title: "How It Works",
          type: "list",
          content: [
            {
              label: "Community Project:",
              text: "One shared Album Series that all users contribute to",
            },
            {
              label: "Album-Centric Packs:",
              text: "Each entry focuses on songs from a specific album",
            },
            {
              label: "Private Development:",
              text: "Album series remain private while you work on them",
            },
            {
              label: "Public Release:",
              text: "When you release an album series, it gets a series number and becomes visible to everyone",
            },
            {
              label: "Any Album Qualifies:",
              text: "No themes or restrictions - any album can be added",
            },
          ],
        },
      ],
    },
    {
      title: "Creating Album Series",
      subsections: [
        {
          title: "Qualification Requirements",
          type: "paragraph",
          content:
            "When your pack has 4 or more songs from the same album, TrackFlow recognizes it as eligible for the Album Series and allows you to add it to the community project.",
        },
        {
          title: "Two Ways to Create Album Series Entries",
          items: [
            {
              title: "Method 1: During Pack Creation",
              highlightColor: "#e7f3ff",
              borderColor: "#b3d9ff",
              steps: [
                'When creating a new pack, check "Create as Album Series"',
                "This automatically marks your pack as an Album Series entry",
                "You get immediate access to the Album Series Editor",
                "Use the editor to easily add songs from the complete album tracklist",
              ],
            },
            {
              title: "Method 2: Convert Existing Pack",
              highlightColor: "#f0f9f0",
              borderColor: "#c3e6c3",
              steps: [
                "Create a regular pack with 4+ songs from the same album",
                "TrackFlow will recognize the album pattern",
                'In the pack dropdown menu, look for "Make Album Series"',
                "Click the option to convert your pack to an Album Series entry",
                "Your pack becomes part of the community Album Series",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Album Series Editor",
      type: "highlight-box",
      highlightColor: "#e7f3ff",
      borderColor: "#b3d9ff",
      content: {
        title: "Smart Album Management",
        description:
          "The Album Series Editor fetches the complete album tracklist and provides intelligent track management with visual indicators for each song:",
        subsections: [
          {
            title: "Track Status Indicators",
            type: "list",
            content: [
              {
                label: "✅ In Pack:",
                text: "Song is already in your pack",
              },
              {
                label: "🎵 Official DLC:",
                text: "Automatically detected as existing Rock Band DLC",
              },
              {
                label: "⚠️ Preexisting:",
                text: "Marked as already done by community",
              },
              {
                label: "❌ Missing:",
                text: "Not in pack yet, can be added with one click",
              },
              {
                label: "🚫 Irrelevant:",
                text: "Marked as not relevant (interludes, skits, demos, bonus tracks etc.)",
              },
            ],
          },
          {
            title: "Key Features",
            type: "list",
            content: [
              {
                label: "One-Click Addition:",
                text: "Add missing tracks instantly",
              },
              {
                label: "Automatic DLC Detection:",
                text: "Prevents duplicate work on official songs",
              },
              {
                label: "Mark as Irrelevant:",
                text: "Flag tracks that shouldn't be customs (interludes, spoken word)",
              },
              {
                label: "Mark as Preexisting:",
                text: "Note tracks already done as customs by others",
              },
              {
                label: "Coverage Tracking:",
                text: "Shows completion percentage",
              },
              {
                label: "Link Existing Songs:",
                text: "Connect differently-named songs in your pack",
              },
            ],
          },
          {
            title: "Benefits",
            type: "list",
            content: [
              "No need to manually type every song title from an album",
              "Ensures you don't miss any tracks from the album",
              "Maintains consistent naming and metadata across the album",
              "Streamlines the process of creating complete album packs",
            ],
          },
        ],
      },
    },
    {
      title: "Community Impact",
      type: "highlight-box",
      highlightColor: "#f0f9f0",
      borderColor: "#c3e6c3",
      content: {
        items: [
          {
            label: "Shared Goal:",
            text: "Everyone works toward growing the same Album Series count",
          },
          {
            label: "Diverse Contributions:",
            text: "Any album from any artist, genre, or era can be added",
          },
          {
            label: "Progress Tracking:",
            text: "See the community's total progress across all albums",
          },
          {
            label: "Collaboration:",
            text: "Multiple people can work on different albums simultaneously",
          },
          {
            label: "Recognition:",
            text: "Your album contributions are part of the larger community achievement",
          },
        ],
      },
    },
  ],
};

