/**
 * Achievements & Points section content
 */
export const achievementsContent = {
  title: "🏆 Achievements & Points",
  sections: [
    {
      title: "How Points Work",
      type: "paragraph",
      content:
        "TrackFlow has a dual point system to reward your progress and engagement. You earn points both from immediate song releases and by unlocking achievements.",
      subsections: [
        {
          type: "highlight-box",
          highlightColor: "#e7f3ff",
          borderColor: "#b3d9ff",
          content: {
            title: "Two Ways to Earn Points",
            subsections: [
              {
                type: "info-box",
                content: {
                  items: [
                    {
                      title: "🎯 Instant Release Points",
                      description: "Get 10 points immediately for every song you release - no matter what! This encourages completing and sharing your work."
                    },
                    {
                      title: "🏆 Achievement Points", 
                      description: "Unlock achievements for bonus points ranging from 10-500 points based on rarity and difficulty."
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    },
    {
      title: "Achievement Categories",
      type: "paragraph", 
      content:
        "Achievements are organized into different categories that track various aspects of your TrackFlow journey:",
      subsections: [
        {
          type: "list",
          content: [
            {
              label: "🎵 Milestone Released:",
              text: "Points for releasing songs (10, 50, 100+ songs released)"
            },
            {
              label: "📋 Milestone Future:",
              text: "Points for planning songs (adding to your Future Plans list)"
            },
            {
              label: "🎬 Milestone WIP:",
              text: "Points for actively working on songs (Work In Progress)"
            },
            {
              label: "✨ Quality:",
              text: "Points for completing authoring fields and workflow steps thoroughly"
            },
            {
              label: "🤝 Social:",
              text: "Points for collaboration, community interaction, and sharing"
            },
            {
              label: "🎨 Diversity:",
              text: "Points for exploring different artists, years, and musical variety"
            }
          ]
        }
      ]
    },
    {
      title: "Leaderboard",
      type: "paragraph",
      content:
        "The leaderboard ranks all TrackFlow users by their total points from both releases and achievements. See where you stand in the community!",
      subsections: [
        {
          type: "steps",
          content: [
            "Visit the Achievements page to see your current rank",
            "View your total points from releases (10 per song) and achievements",
            "Check your progress toward unlocking new achievements", 
            "Compare your ranking with other community members",
            "Track your rarest achievements and showcase your accomplishments"
          ]
        },
        {
          type: "info-box",
          content: {
            items: [
              {
                title: "💡 Pro Tip",
                description: "The fastest way to climb the leaderboard is consistently releasing songs (10 points each) while working toward high-value achievements!"
              }
            ]
          }
        }
      ]
    },
    {
      title: "Tracking Your Progress",
      type: "paragraph",
      content:
        "Stay motivated by monitoring your achievement progress and celebrating milestones:",
      subsections: [
        {
          type: "list",
          content: [
            {
              label: "📊 Achievement Progress:",
              text: "See percentage completion toward each locked achievement"
            },
            {
              label: "🔔 Notifications:",
              text: "Get notified when you unlock new achievements or earn release points"
            },
            {
              label: "📈 Statistics:",
              text: "View detailed stats on the Stats page showing your points breakdown"
            },
            {
              label: "🏅 Rarity Levels:",
              text: "Achievements have different rarity levels - Common (10-25 pts), Uncommon (50-100 pts), Rare (150-250 pts), Epic (300-400 pts), Legendary (500 pts)"
            }
          ]
        }
      ]
    }
  ]
};