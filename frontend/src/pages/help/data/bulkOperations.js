/**
 * Bulk Operations section content
 */
export const bulkOperationsContent = {
  title: "⚡ Bulk Operations",
  sections: [
    {
      title: "Bulk Selection",
      type: "paragraph",
      content:
        "Select multiple songs across different packs to perform batch operations efficiently. Bulk operations are available on the Future Plans and Released pages.",
      subsections: [
        {
          title: "How to Select Songs",
          type: "list",
          content: [
            {
              label: "Individual Selection:",
              text: "Click checkboxes next to song titles",
            },
            {
              label: "Select All:",
              text: "Use the header checkbox to select all visible songs",
            },
            {
              label: "Cross-Pack Selection:",
              text: "Select songs from different packs for batch operations",
            },
            {
              label: "Pack-Level Selection:",
              text: "Select entire packs at once",
            },
          ],
        },
      ],
    },
    {
      title: "Available Operations",
      type: "grid",
      content: {
        columns: 2,
        items: [
          {
            title: "📝 Bulk Editing",
            highlightColor: "#e7f3ff",
            borderColor: "#b3d9ff",
            items: [
              {
                label: "Artist:",
                text: "Change artist for multiple songs",
              },
              {
                label: "Album:",
                text: "Update album name across songs",
              },
              {
                label: "Year:",
                text: "Set release year for multiple tracks",
              },
              {
                label: "Pack:",
                text: "Move songs to different packs",
              },
              {
                label: "Album Art:",
                text: "Update cover art using an artwork link",
              },
            ],
          },
          {
            title: "🔄 Status Operations",
            highlightColor: "#f0f9f0",
            borderColor: "#c3e6c3",
            items: [
              {
                label: "Start Work:",
                text: "Move songs from Future Plans to WIP",
              },
              {
                label: "Release Songs:",
                text: "Mark completed songs as Released",
              },
              {
                label: "Back to Future:",
                text: "Return songs to planning stage",
              },
              {
                label: "Mark Optional:",
                text: "Toggle optional status",
              },
            ],
          },
          {
            title: "🎧 Spotify Operations",
            highlightColor: "#fff3cd",
            borderColor: "#ffeaa7",
            items: [
              {
                label: "Bulk Enhancement:",
                text: "Enhance multiple songs with Spotify data",
              },
              {
                label: "Clean Remaster Tags:",
                text: "Remove remaster suffixes from song titles",
              },
            ],
          },
          {
            title: "🗑️ Management",
            highlightColor: "#ffe6e6",
            borderColor: "#ffb3b3",
            items: [
              {
                label: "Bulk Delete:",
                text: "Remove multiple songs at once",
              },
              {
                label: "Confirmation:",
                text: "Always confirms before deleting",
              },
            ],
          },
        ],
      },
    },
  ],
};

