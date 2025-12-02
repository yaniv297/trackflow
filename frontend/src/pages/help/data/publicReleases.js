/**
 * Public Releases & Sharing section content
 */
export const publicReleasesContent = {
  title: "🌐 Releases & Sharing", 
  sections: [
    {
      title: "Release Packs",
      type: "paragraph",
      content:
        "When you release a pack, you can create a rich release post with additional content that will appear on the TrackFlow homepage for the community to discover.",
      subsections: [
        {
          type: "highlight-box",
          highlightColor: "#e7f8e7",
          borderColor: "#b3e6b3",
          content: {
            title: "Creating a Release Post",
            steps: [
              "Release your pack (status: Released) to earn your 10 points per song",
              "Use the release pack feature to add metadata to your release",
              "Add a description or text about your release",
              "Include a download link for users to get your pack",
              "Add a YouTube video URL to showcase your work (videos are automatically embedded)",
              "Your release will appear on the TrackFlow homepage for everyone to see",
              "Optional: Choose to hide your release from the homepage if you prefer a private release"
            ]
          }
        },
        {
          type: "info-box",
          content: {
            items: [
              {
                title: "📝 Release Content",
                description: [
                  "Description/Text: Add custom text about your release, notes, credits, or any information you want to share",
                  "Download Link: Provide a direct link where users can download your pack",
                  "YouTube Video: Paste a YouTube URL to embed a video - perfect for showcasing gameplay or previews"
                ]
              }
            ]
          }
        }
      ]
    },
    {
      title: "Homepage Visibility",
      type: "paragraph",
      content:
        "All releases with release metadata appear on the TrackFlow homepage in the Latest Releases section, giving your work maximum visibility within the community.",
      subsections: [
        {
          type: "list",
          content: [
            {
              label: "🌟 Featured Display:",
              text: "Your release post appears prominently on the homepage with all your added content"
            },
            {
              label: "📺 Video Embeds:",
              text: "YouTube videos are automatically embedded and playable directly on the homepage"
            },
            {
              label: "🔗 Quick Access:",
              text: "Download links and video links are easily accessible with prominent buttons"
            },
            {
              label: "🔒 Private Option:",
              text: "You can choose to release privately without appearing on the homepage if you prefer"
            }
          ]
        }
      ]
    }
  ]
};