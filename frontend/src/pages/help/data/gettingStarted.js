/**
 * Getting Started section content
 */
export const gettingStartedContent = {
  title: "🚀 Getting Started",
  sections: [
    {
      title: "What is TrackFlow?",
      type: "paragraph",
      content:
        "TrackFlow is a comprehensive project management system designed for Rock Band custom song authoring. It helps you track your authoring progress, collaborate with other authors, and manage multiple songs and packs efficiently from initial planning through final release.",
    },
    {
      title: "Understanding Song Statuses",
      type: "info-box",
      content: {
        intro:
          "TrackFlow organizes your songs into three statuses that represent different stages of your authoring process:",
        items: [
          {
            icon: "🗓️",
            title: "Future Plans",
            color: "#6c757d",
            description:
              "Songs you're planning to work on but haven't started yet. This is your backlog of ideas and planned projects. New songs start here automatically.",
          },
          {
            icon: "⚡",
            title: "In Progress (WIP)",
            color: "#007bff",
            description:
              "Songs you're actively working on. These appear on your WIP page with progress tracking and workflow steps. This is where you'll spend most of your time authoring.",
          },
          {
            icon: "✅",
            title: "Released",
            color: "#28a745",
            description:
              "Completed songs that are finished and published. You earn 10 points for every song you release! These represent your completed work and achievements.",
          },
        ],
      },
    },
    {
      title: "Your First Steps",
      type: "info-box",
      content: {
        items: [
          {
            title: "1. Create Your First Song",
            description: [
              'Click the "New +" button in the navigation',
              'Select "New Song" to create a single track',
              "Enter the song title and artist",
              "Choose or create a pack to organize it",
              "The song will automatically be enhanced with Spotify metadata",
              "Your new song will appear in Future Plans",
            ],
          },
          {
            title: "2. Create Your First Pack",
            description: [
              'Click "New +" → "New Pack" for multiple songs',
              'Choose "Single Artist" mode for one artist, multiple songs',
              'Or "Mixed Artists" mode using "Artist - Title" format',
              "All songs will be grouped together for easy management",
              "All new songs start in Future Plans status",
            ],
          },
          {
            title: "3. Start Working on Songs",
            description: [
              "Go to the Future Plans page to see your planned songs",
              "Select songs you want to work on",
              'Open the pack\'s actions dropdown (gear) and click "Start Work" to move them to WIP',
              "Your songs will now appear on the WIP page with progress tracking",
            ],
          },
          {
            title: "4. Track Your Progress",
            description: [
              "Navigate to the WIP (Work In Progress) page",
              "Check off workflow steps as you complete them",
              "Watch your progress bars fill up",
              "Celebrate when you complete songs! 🎉",
            ],
          },
        ],
      },
    },
    {
      title: "Quick Tour: Main Navigation",
      type: "list",
      content: [
        {
          label: "WIP:",
          text: "Your main workspace - songs you're actively working on",
        },
        {
          label: "Future Plans:",
          text: "Songs in planning stage, not yet started",
        },
        {
          label: "Released:",
          text: "Completed songs you've finished",
        },
        {
          label: "Album Series:",
          text: "Manage complete album collections",
        },
        {
          label: "Achievements:",
          text: "Track your progress, view unlocked achievements, and see your leaderboard rank",
        },
        {
          label: "Community:",
          text: "Discover public songs, find collaborators, and connect with other users",
        },
        {
          label: "Stats:",
          text: "View your progress analytics, completion rates, and points breakdown",
        },
        {
          label: "Settings:",
          text: "Customize your workflow, profile, and help documentation",
        },
      ],
    },
  ],
};
