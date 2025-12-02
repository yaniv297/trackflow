/**
 * Public WIP & Collaboration Requests section content
 */
export const collaborationRequestsContent = {
  title: "🤝 WIP & Collaboration Requests",
  sections: [
    {
      title: "Public WIP Songs",
      type: "paragraph", 
      content:
        "Share your work-in-progress and future plans publicly to find collaborators on your projects. This feature is only applicable to Future Plans or In Progress/WIP songs.",
      subsections: [
        {
          type: "highlight-box",
          highlightColor: "#fff7e6",
          borderColor: "#ffcc80",
          content: {
            title: "Making WIP Songs Public",
            steps: [
              "Toggle the song's public visibility to make it discoverable", 
              "Your song appears in the Community feed for others to see",
              "Other users can view your project details and progress",
              "Interested collaborators can send you collaboration requests"
            ]
          }
        }
      ]
    },
    {
      title: "Sending Collaboration Requests",
      type: "paragraph",
      content:
        "Found an interesting song in the Community section? Request to collaborate and contribute your skills:",
      subsections: [
        {
          type: "steps",
          content: [
            "Browse public WIP songs in the Community section",
            "Find a song or pack that interests you",
            "Send a collaboration request with a thoughtful message, specifying which parts you want to work on",
            "Wait for the song owner to accept or decline your request"
          ]
        },
        {
          type: "info-box",
          content: {
            items: [
              {
                title: "💡 Collaboration Tips",
                description: "Include a clear message explaining what you'd like to contribute and why you're interested in the project. Be specific about your skills!"
              }
            ]
          }
        }
      ]
    },
    {
      title: "Managing Incoming Requests",
      type: "paragraph",
      content:
        "When others want to collaborate on your public WIP songs, you have full control over who joins your projects:",
      subsections: [
        {
          type: "list",
          content: [
            {
              label: "🔔 Notifications:",
              text: "Receive notifications when someone requests to collaborate on your songs"
            },
            {
              label: "✅ Accept Requests:",
              text: "Give collaborators edit permissions for the specific parts they requested"
            },
            {
              label: "❌ Decline Requests:",
              text: "Politely decline if the collaboration doesn't fit your vision"
            },
            {
              label: "🔄 Reopen Requests:",
              text: "Change your mind? You can reopen previously rejected requests"
            },
            {
              label: "👥 Manage Collaborators:",
              text: "Add, remove, or modify collaborator permissions at any time"
            }
          ]
        }
      ]
    }
  ]
};