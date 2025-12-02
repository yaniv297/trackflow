/**
 * Collaboration section content
 */
export const collaborationContent = {
  title: "🤝 Collaboration",
  sections: [
    {
      title: "How Collaboration Works",
      type: "paragraph",
      content:
        "TrackFlow supports both pack-level and song-level collaboration. All collaborators work with the same workflow as defined by the song owner, ensuring everyone is aligned on the required steps.",
      subsections: [
        {
          type: "highlight-box",
          highlightColor: "#f8f9fa",
          borderColor: "#dee2e6",
          content: {
            subsections: [
              {
                title: "Pack Collaboration",
                type: "list",
                content: [
                  {
                    label: "View Access:",
                    text: "Collaborators can see all songs in the pack",
                  },
                  {
                    label: "Edit Access:",
                    text: "Collaborators can modify any song in the pack",
                  },
                  {
                    label: "Owner's Workflow:",
                    text: "All songs use the workflow defined by their respective owners",
                  },
                  {
                    label: "Shared Progress:",
                    text: "Everyone can see each other's completion status",
                  },
                ],
              },
              {
                title: "Song Collaboration",
                type: "paragraph",
                content:
                  "Song collaboration is for assigning specific workflow parts on a single song to a collaborator. It is only available in WIP mode.",
              },
              {
                type: "steps",
                content: [
                  "Open the song on the WIP page.",
                  'Click the song\'s actions gear and choose "Make Collab".',
                  "Select a collaborator (existing user).",
                  "Choose the parts to assign (e.g., Guitar, Vocals, Keys).",
                  "Save. The song now displays badges showing who owns which parts.",
                ],
              },
              {
                type: "paragraph",
                content:
                  "Owners retain control of the song and its workflow. Collaborators only see and work on the parts you assigned. Progress badges on the WIP card will reflect the collaborator's assignments next to their username.",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Adding Collaborators",
      type: "highlight-box",
      highlightColor: "#e7f3ff",
      borderColor: "#b3d9ff",
      content: {
        title: "Step-by-Step Process",
        steps: [
          "Navigate to the song or pack you want to share",
          'Click the "Add Collaborator" button',
          "Choose an existing user from the dropdown",
          "Select the permission level (View or Edit)",
          "The collaborator will immediately see the shared content",
        ],
        subsections: [
          {
            title: "Permission Levels",
            type: "list",
            content: [
              {
                label: "View:",
                text: "Can see songs and progress but cannot edit",
              },
              {
                label: "Edit:",
                text: "Can modify songs, update workflow steps, and change details",
              },
            ],
          },
        ],
      },
    },
  ],
};
