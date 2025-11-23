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
        ],
      },
    },
  ],
};

