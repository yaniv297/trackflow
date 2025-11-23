/**
 * FAQ section content
 */
export const faqContent = {
  title: "❓ Frequently Asked Questions",
  sections: [
    {
      title: "Getting Started Questions",
      type: "faq",
      content: [
        {
          question: "How do I create my first song?",
          answer:
            'Click "New +" → "New Song" in the navigation. Enter the song title and artist, choose a pack (or create a new one), and the song will be automatically enhanced with Spotify metadata.',
        },
        {
          question: "What's the difference between a song and a pack?",
          answer:
            'A song is an individual track you\'re working on. A pack is a collection of related songs, usually representing an album or themed collection. Packs help organize your work and track progress across multiple songs.',
        },
        {
          question: "How do I set up my workflow?",
          answer:
            "Go to Settings → Workflow to customize your authoring steps. Add steps like \"Tempo Map\", \"Drums\", \"Bass\", etc. You can reorder them by dragging, rename them, or add custom steps that match your process.",
        },
      ],
    },
    {
      title: "Workflow & Progress Questions",
      type: "faq",
      content: [
        {
          question: "How do I mark workflow steps as complete?",
          answer:
            "On the WIP page, click the checkboxes next to each workflow step as you complete them. The progress bar will update automatically, and you'll get a celebration when the song is 100% complete! 🎉",
        },
        {
          question: "What are the different song statuses?",
          answer:
            "Future Plans: Songs you're planning to work on but haven't started.\nIn Progress (WIP): Songs you're actively working on with workflow tracking.\nReleased: Completed songs that are finished and published.",
        },
        {
          question: "How do I move songs between statuses?",
          answer:
            'Use "Start Work" to move songs from Future Plans to WIP. When a pack is complete, use "Release Pack" to move finished songs to Released. You can also edit individual song status in the song details.',
        },
      ],
    },
    {
      title: "Spotify & Enhancement Questions",
      type: "faq",
      content: [
        {
          question: "How does Spotify integration work?",
          answer:
            "When you create songs, TrackFlow automatically searches Spotify for matches and imports album art, release year, and album information. If multiple matches are found, you can choose the best one.",
        },
        {
          question: "Can I import entire Spotify playlists?",
          answer:
            'Absolutely! Use "Import from Spotify" in the main menu. Paste any public Spotify playlist URL, and all songs will be imported with full metadata and organized into a pack.',
        },
      ],
    },
    {
      title: "Collaboration Questions",
      type: "faq",
      content: [
        {
          question: "How do collaborations work with different workflows?",
          answer:
            "There's only one workflow per song, which is determined by the song owner/creator. All collaborators on that song see and use the same workflow steps as defined by the song owner.",
        },
      ],
    },
    {
      title: "Still Need Help?",
      type: "contact-box",
      content: {
        title: "📧 Still Need Help?",
        description:
          "If you have questions not covered here or need feature requests, feel free to contact the admin Yaniv:",
        contact: [
          {
            label: "Discord:",
            text: "yaniv297",
          },
          {
            label: "Email:",
            text: "yanivb297@gmail.com",
          },
        ],
        note: "You can also look for updates to this guide as new features are added.",
      },
    },
  ],
};

