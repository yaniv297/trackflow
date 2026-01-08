/**
 * Statuses & Workflow section content
 */
export const statusesAndWorkflowContent = {
  title: "📋 Song Statuses & Workflow",
  sections: [
    {
      title: "The Three Statuses",
      type: "info-box",
      content: {
        items: [
          {
            icon: "🗓️",
            title: "Future Plans",
            color: "#6c757d",
            description:
              "Songs you're planning to work on but haven't started yet. This is your backlog of ideas and planned projects.",
          },
          {
            icon: "⚡",
            title: "In Progress (WIP)",
            color: "#007bff",
            description:
              "Songs you're actively working on. These appear on your WIP page with workflow tracking, progress bars, and completion percentages.",
          },
          {
            icon: "✅",
            title: "Released",
            color: "#28a745",
            description:
              "Completed songs that are finished and published. These represent your completed work and achievements.",
          },
        ],
      },
    },
    {
      title: "Moving Between Statuses",
      type: "list",
      content: [
        {
          label: "Future → WIP:",
          text: 'Use "Start Work" button or move individual songs',
        },
        {
          label: "WIP → Released:",
          text: "Complete all workflow steps, then release the pack",
        },
        {
          label: "Released → Future:",
          text: 'Use "Move to Future Plans" to reopen completed work',
        },
        {
          label: "Individual Songs:",
          text: "Edit song status directly in song details",
        },
      ],
    },
    {
      title: "Custom Workflows",
      type: "paragraph",
      content:
        "Every user has their own custom workflow - the specific steps they need to complete for each song.",
      subsections: [
        {
          title: "Setting Up Your Workflow",
          type: "list",
          content: [
            {
              label: "Access:",
              text: "Go to Settings → Workflow",
            },
            {
              label: "Add Steps:",
              text: 'Click "Add Step" and name your custom steps',
            },
            {
              label: "Reorder:",
              text: "Drag and drop to arrange steps in your preferred order",
            },
            {
              label: "Rename:",
              text: "Click any step name to edit it",
            },
            {
              label: "Remove:",
              text: "Delete steps you don't need",
            },
            {
              label: "Reset:",
              text: "Return to default workflow anytime",
            },
          ],
        },
        {
          title: "Common Workflow Steps",
          type: "two-column",
          content: {
            left: {
              title: "Audio Processing:",
              items: ["Demucs (stem separation)", "MIDI extraction", "Tempo mapping"],
            },
            right: {
              title: "Instrument Authoring:",
              items: [
                "Drums",
                "Bass",
                "Guitar",
                "Vocals",
                "Harmonies",
                "Pro Keys",
              ],
            },
          },
        },
      ],
    },
    {
      title: "Managing WIP Songs",
      type: "highlight-box",
      highlightColor: "#e7f3ff",
      borderColor: "#b3d9ff",
      content: {
        title: "The WIP Page - Your Main Workspace",
        items: [
          {
            label: "Progress Tracking:",
            text: "Click workflow checkboxes to mark steps complete",
          },
          {
            label: "Visual Progress:",
            text: "Progress bars show completion percentage",
          },
          {
            label: "Pack View:",
            text: "Songs grouped by pack with pack-level progress",
          },
          {
            label: "Completion View:",
            text: "Songs grouped by how complete they are",
          },
          {
            label: "Celebrations:",
            text: "🎉 Fireworks when you complete songs!",
          },
          {
            label: "Quick Actions:",
            text: "Edit, delete, enhance, or collaborate on songs",
          },
        ],
      },
    },
    {
      title: "Remove Parts (Per-Song)",
      type: "highlight-box",
      highlightColor: "#fff8e6",
      borderColor: "#ffe0a3",
      content: {
        title: "Skip Instruments That Don't Exist in a Song",
        items: [
          {
            label: "Purpose:",
            text: "Remove workflow steps for instruments that don't exist in a specific song (e.g., a song without Keys or Pro Keys)",
          },
          {
            label: "How to Access:",
            text: "Click the ⋯ menu on any WIP song card → \"Remove Parts\"",
          },
          {
            label: "Effect on Progress:",
            text: "Removed parts don't count toward completion - both for the individual song and the overall pack percentage",
          },
          {
            label: "Example:",
            text: "If your workflow has 12 steps but a song has no keys, remove the Keys and Pro Keys steps. The song will now calculate completion from 10 steps instead of 12",
          },
          {
            label: "Visual Indicator:",
            text: "Removed parts appear with strikethrough styling in the song's workflow badges, and the progress bar shows how many parts were removed",
          },
        ],
      },
    },
    {
      title: "Workflow Best Practices",
      type: "info-box",
      content: {
        items: [
          {
            title: "Optional Songs",
            description:
              "Flag uncertain tracks as optional when you add them to a pack. They still show up on your WIP board, but they do not count toward the pack's completion percentage until you make them required again - perfect for \"maybe\" songs or bonus content you're not ready to commit to yet.",
          },
        ],
        tips: [
          "Check off steps as you complete them - don't wait until the end",
          "Use the progress bars to prioritize which songs to focus on",
          "Customize your workflow to match your actual process",
          "Add new steps when you discover new parts of your process",
          "Use \"Remove Parts\" to skip instruments that don't exist in specific songs",
        ],
      },
    },
    {
      title: "Instrument Difficulties",
      type: "highlight-box",
      highlightColor: "#f0f7ff",
      borderColor: "#c2d9f2",
      content: {
        title: "Track In-Game Difficulty Ratings",
        items: [
          {
            label: "Purpose:",
            text: "Record the in-game difficulty rating for each instrument as you finish charting it - so you'll have it ready when it's time to upload",
          },
          {
            label: "Difficulty Scale:",
            text: "Rock Band difficulty goes from 0 dots (easiest) to 5 dots (hardest), plus 😈 Devil Tier for the most challenging charts",
          },
          {
            label: "Supported Instruments:",
            text: "Drums, Bass, Guitar, Vocals, Harmonies, Keys, and Pro Keys",
          },
          {
            label: "How to Use:",
            text: "Click the \"Difficulties\" button on any WIP song card to expand the panel, then click any instrument's value to set or change it",
          },
          {
            label: "Toggle Feature:",
            text: "This feature can be enabled or disabled in Settings → Settings tab → \"Show instrument difficulties in WIP\"",
          },
        ],
      },
    },
    {
      title: "Content Rating",
      type: "highlight-box",
      highlightColor: "#fff5f5",
      borderColor: "#f5c2c7",
      content: {
        title: "Track Content Maturity Ratings",
        items: [
          {
            label: "Purpose:",
            text: "Set a content maturity rating for each song so you remember what's appropriate for different audiences when it's time to release",
          },
          {
            label: "Rating Options:",
            text: "👨‍👩‍👧‍👦 Family Friendly (all ages), ⚠️ Supervision Recommended (mild content), 🔞 Mature (explicit content)",
          },
          {
            label: "Family Friendly:",
            text: "Suitable for all ages. No explicit content, mild themes only.",
          },
          {
            label: "Supervision Recommended:",
            text: "May contain mild language, suggestive themes, or references to substances.",
          },
          {
            label: "Mature:",
            text: "Contains explicit language, adult themes, or strong content. Not suitable for younger audiences.",
          },
          {
            label: "How to Use:",
            text: "Click the \"Rating\" button on any WIP song card and select the appropriate rating from the dropdown",
          },
          {
            label: "Toggle Feature:",
            text: "This feature is disabled by default. Enable it in Settings → Settings tab → \"Show content rating in WIP\"",
          },
        ],
      },
    },
    {
      title: "Updating Released Songs",
      type: "highlight-box",
      highlightColor: "#fff8e6",
      borderColor: "#ffc107",
      content: {
        title: "Mark Songs for Updates - Dual-Presence Tracking",
        items: [
          {
            label: "Purpose:",
            text: "Mark released songs that need improvements or updates. The song will appear in both Released (showing the current version) and Future Plans/WIP (for tracking the update) simultaneously.",
          },
          {
            label: "How to Mark:",
            text: "On the Released page, enable the \"Update\" column (hidden by default), then click the circle icon (○) next to any song to mark it as needing an update. The icon will change to a checkmark (✓).",
          },
          {
            label: "Dual Presence:",
            text: "When marked, the song appears in both Released and Future Plans (or WIP if you move it there). This lets you track updates while keeping the original release visible.",
          },
          {
            label: "Visual Indicators:",
            text: "Songs marked for update show a 🔁 icon after their title in Future Plans/WIP views, and a badge in WIP cards indicating \"Updating Released Song\".",
          },
          {
            label: "Pack Organization:",
            text: "Update songs can be grouped in packs with new songs. When the pack moves to WIP, all songs (including updates) move together, and update songs get fresh progress tracking.",
          },
          {
            label: "Completing Updates:",
            text: "When you release the updated version (either individually or as part of a pack), the update status is cleared and the song returns to normal Released status with the new release date.",
          },
          {
            label: "Progress Reset:",
            text: "When an update song moves to WIP, its progress is reset so you can track the new work from scratch.",
          },
        ],
      },
    },
  ],
};

