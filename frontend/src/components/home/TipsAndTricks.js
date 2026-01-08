import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./TipsAndTricks.css";

const TipsAndTricks = () => {
  const [currentTip, setCurrentTip] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Parse tips from the markdown content
  const createTips = () => {
    const tips = [
      {
        id: 1,
        title: "Auto-completion of New Workflow Steps",
        summary:
          "When you add a new step to your workflow, TrackFlow automatically marks it as complete for songs that already had all previous steps finished.",
        category: "workflow",
        link: "/settings/workflow",
      },
      {
        id: 2,
        title: "Workflow Inheritance for Collaborators",
        summary:
          "When you collaborate on someone else's song, you automatically use the song owner's workflow, not your own.",
        category: "collaboration",
      },
      {
        id: 3,
        title: "Pack Priority System",
        summary:
          "Packs have a priority field (1-5 scale, where 5 is highest). You can set priorities to organize your workflow and sort by them.",
        category: "organization",
      },
      {
        id: 4,
        title: "In-Place Editing with Auto-Save",
        summary:
          "Click any song field directly in the table to edit it. Changes save automatically when you click away or press Enter.",
        category: "productivity",
      },
      {
        id: 5,
        title: "Smart Title Cleaning",
        summary:
          "Use the 'Clean Remaster Tags' bulk action to remove patterns like '(Remastered 2010)', '(Deluxe Edition)', and other variations.",
        category: "productivity",
      },
      {
        id: 6,
        title: "Optional Songs Don't Count",
        summary:
          "Mark songs as 'optional' to exclude them from pack completion calculations. Perfect for songs you're unsure about including.",
        category: "workflow",
      },
      {
        id: 7,
        title: "File Links for Finished Songs",
        summary:
          "When a song is 100% complete (all authoring fields done), you can add file links without requiring a message.",
        category: "workflow",
      },
      {
        id: 8,
        title: "Album Series Features",
        summary:
          "Convert packs with 4+ songs from one album into Album Series. Use 'Make Album Series' in the pack dropdown.",
        category: "organization",
        link: "/album-series",
      },
      {
        id: 9,
        title: "Achievement Progress Tracking",
        summary:
          "View your progress toward count-based achievements on the achievements page to see how close you are to the next milestone.",
        category: "gamification",
        link: "/achievements",
      },
      {
        id: 10,
        title: "Year Distribution Charts",
        summary:
          "The stats page includes interactive charts showing your song distribution by release year.",
        category: "analytics",
        link: "/stats",
      },
      {
        id: 11,
        title: "Feature Request Voting",
        summary:
          "You can upvote or downvote feature requests. Each user gets one vote per request, and you can change your vote.",
        category: "community",
        link: "/feature-requests",
      },
      {
        id: 12,
        title: "Cross-Pack Bulk Selection",
        summary:
          "You can select songs from multiple different packs simultaneously for bulk operations on Future Plans and Released pages.",
        category: "productivity",
      },
      {
        id: 13,
        title: "Custom Workflow Steps",
        summary:
          "You can create completely custom workflow steps beyond the predefined ones. Name them whatever makes sense for your process.",
        category: "workflow",
        link: "/settings/workflow",
      },
      {
        id: 14,
        title: "Smart Search Features",
        summary:
          "Search is case-insensitive with partial matching. You can search by collaborator username and across all your accessible content.",
        category: "productivity",
      },
      {
        id: 15,
        title: "DLC Status Checking",
        summary:
          "The system automatically checks and warns you if songs are official Rock Band DLC when you create them.",
        category: "workflow",
      },
      {
        id: 16,
        title: "Preferred Contact Method",
        summary:
          "Set your preferred contact method (email or Discord) and Discord username for collaboration purposes in User Settings.",
        category: "collaboration",
        link: "/settings",
      },
      {
        id: 17,
        title: "Celebration Animations",
        summary:
          "When you complete songs, you get celebration animations (fireworks) to make the moment special!",
        category: "gamification",
      },
      {
        id: 18,
        title: "Progress Bar Colors",
        summary:
          "Progress bars change color based on completion percentage, providing visual feedback at a glance.",
        category: "visual",
      },
      {
        id: 19,
        title: "Mark All Notifications as Read",
        summary:
          "You can mark all notifications as read at once from the notifications page.",
        category: "productivity",
        link: "/notifications",
      },
      {
        id: 20,
        title: "Help Page Sections",
        summary:
          "The help page is organized into sections covering Getting Started, Songs & Packs, Collaboration, and more.",
        category: "support",
        link: "/help",
      },
      {
        id: 21,
        title: "Export YARG ini Files",
        summary:
          "Export ini files for YARG directly from WIP songs to quickly create necessary files for YARG.",
        category: "productivity",
      },
      {
        id: 22,
        title: "Quick Links to External Resources",
        summary:
          "Use quick links to Wikipedia, Genius Lyrics, Spotify, and more directly from WIP songs to gather metadata, album covers, lyrics, and chord information.",
        category: "productivity",
      },
      {
        id: 23,
        title: "Mark All Done Button",
        summary:
          "Use the 'Mark All Done' button in WIP songs to quickly complete all workflow steps for a song at once.",
        category: "productivity",
      },
      {
        id: 24,
        title: "File History for Collaborations",
        summary:
          "Add file history for WIP songs to track file versions and share progress with collaborators throughout the authoring process.",
        category: "collaboration",
      },
      {
        id: 25,
        title: "Content Rating for Songs",
        summary:
          "Track content maturity ratings (Family Friendly, Supervision Recommended, Mature) for your songs. Enable this feature in Settings.",
        category: "workflow",
        link: "/settings",
      },
      {
        id: 26,
        title: "Instrument Difficulty Tracking",
        summary:
          "Record in-game difficulty ratings (0-5 dots + devil tier) for each instrument while charting. Great for remembering difficulties when uploading.",
        category: "workflow",
        link: "/settings",
      },
      {
        id: 27,
        title: "Remove Unused Parts",
        summary:
          "Songs missing certain instruments? Use 'Remove Parts' from the song menu to exclude them from completion calculations.",
        category: "workflow",
      },
      {
        id: 28,
        title: "Bulk Collaboration Requests",
        summary:
          "Request collaboration on multiple songs at once! Select songs from the same owner in Community and send a single batch request for all of them.",
        category: "collaboration",
      },
      {
        id: 29,
        title: "Musical Connections",
        summary:
          "Find users working on the same songs or artists as you! The 'Your Musical Connections' section in Community shows shared songs and artists you have in common.",
        category: "community",
        link: "/community",
      },
      {
        id: 30,
        title: "Update Released Songs",
        summary:
          "Mark released songs as 'needs update' to work on improvements while keeping them in your Released list. They'll appear simultaneously in Future Plans or WIP until the update is complete.",
        category: "workflow",
      },
    ];

    return tips;
  };

  const tips = createTips();

  // Select a random tip on component mount
  useEffect(() => {
    if (tips.length > 0) {
      const randomIndex = Math.floor(Math.random() * tips.length);
      setCurrentTip(tips[randomIndex]);
    }
  }, []);

  const getNextTip = () => {
    if (tips.length > 0) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * tips.length);
      } while (
        currentTip &&
        newIndex === tips.indexOf(currentTip) &&
        tips.length > 1
      );
      setCurrentTip(tips[newIndex]);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      workflow: "#9b59b6",
      collaboration: "#e74c3c",
      organization: "#1abc9c",
      productivity: "#3498db",
      gamification: "#e67e22",
      analytics: "#f39c12",
      community: "#2ecc71",
      visual: "#34495e",
      support: "#95a5a6",
    };
    return colors[category] || "#7f8c8d";
  };

  return (
    <section className="tips-and-tricks">
      <h2 className="section-title">Tips & Tricks</h2>
      <div className="tips-widget">
        <div className="tip-display">
          {currentTip ? (
            <TipCard
              tip={currentTip}
              getCategoryColor={getCategoryColor}
              onNext={getNextTip}
              navigate={navigate}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <div className="loading-tip">Loading tip...</div>
          )}
        </div>
      </div>
    </section>
  );
};

const TipCard = ({
  tip,
  getCategoryColor,
  onNext,
  navigate,
  isAuthenticated,
}) => (
  <article className="tip-card compact">
    <div className="tip-header">
      <div className="tip-title-section">
        <h4 className="tip-title">{tip.title}</h4>
        <span
          className="tip-category"
          style={{ backgroundColor: getCategoryColor(tip.category) }}
        >
          {tip.category}
        </span>
      </div>
      <button className="next-tip-button" onClick={onNext} title="Next tip">
        ↻
      </button>
    </div>

    <div className="tip-content">
      <p className="tip-summary">{tip.summary}</p>
      {tip.link && isAuthenticated && (
        <button
          className="tip-link-button"
          onClick={() => navigate(tip.link)}
          title="Learn more"
        >
          Learn More →
        </button>
      )}
    </div>
  </article>
);

export default TipsAndTricks;
