import React, { useState, useEffect } from "react";
import { checkDLCStatus } from "../../../utils/dlcCheck";
import { apiGet } from "../../../utils/api";

const DLCWarning = ({ title, artist, showWarning = true }) => {
  const [dlcStatus, setDlcStatus] = useState(null);
  const [trackflowMatches, setTrackflowMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkTrackFlowMatches = async (title, artist) => {
    try {
      const response = await apiGet(`/api/public-songs/check-duplicates?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
      
      if (response && response.matches) {
        return response.matches;
      }
      return [];
    } catch (error) {
      console.error("Error checking TrackFlow matches:", error);
      return [];
    }
  };

  useEffect(() => {
    const checkAll = async () => {
      if (!title || !artist || title.length < 2 || artist.length < 2) {
        setDlcStatus(null);
        setTrackflowMatches([]);
        return;
      }

      setIsLoading(true);
      try {
        // Check both DLC and TrackFlow matches in parallel
        const [dlcResult, trackflowResult] = await Promise.all([
          checkDLCStatus(title, artist),
          checkTrackFlowMatches(title, artist)
        ]);
        
        setDlcStatus(dlcResult);
        setTrackflowMatches(trackflowResult);
      } catch (error) {
        console.error("Error checking song status:", error);
        setDlcStatus(null);
        setTrackflowMatches([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkAll, 500);
    return () => clearTimeout(timeoutId);
  }, [title, artist]);

  if (!showWarning || (!dlcStatus && trackflowMatches.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        style={{
          padding: "0.5rem",
          margin: "0.5rem 0",
          borderRadius: "6px",
          background: "#f8f9fa",
          border: "1px solid #e9ecef",
          fontSize: "0.9rem",
          color: "#6c757d",
        }}
      >
        🔍 Checking if this song already exists...
      </div>
    );
  }

  // Don't render if no warnings to show
  if ((!dlcStatus || !dlcStatus.is_dlc) && trackflowMatches.length === 0) {
    return null;
  }

  // Get origin display name
  const getOriginDisplay = (origin) => {
    const originMap = {
      RB1: "Rock Band 1",
      RB2: "Rock Band 2",
      RB3: "Rock Band 3",
      RB4: "Rock Band 4",
      DLC: "Downloadable Content",
      Beatles: "The Beatles: Rock Band",
      "Green Day": "Green Day: Rock Band",
      Lego: "Lego Rock Band",
    };
    return originMap[origin] || origin;
  };

  // Separate released and WIP songs
  const releasedSongs = trackflowMatches.filter(song => song.status === "Released");
  const wipSongs = trackflowMatches.filter(song => song.status === "In Progress" || song.status === "Future Plans");

  const renderDLCWarning = () => {
    if (!dlcStatus || !dlcStatus.is_dlc) return null;
    
    const originDisplay = getOriginDisplay(dlcStatus.origin);

    return (
      <div
        style={{
          padding: "0.75rem",
          margin: "0.5rem 0",
          borderRadius: "8px",
          background: "#fff3cd",
          border: "1px solid #ffeaa7",
          fontSize: "0.9rem",
          color: "#856404",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>⚠️</span>
          <strong>Official Rock Band DLC Detected</strong>
        </div>

        <div style={{ marginLeft: "1.5rem" }}>
          <p style={{ margin: "0.25rem 0" }}>
            This song is already available as official Rock Band content:{" "}
            <strong>{originDisplay}</strong>
          </p>

          {dlcStatus.match_type === "partial" && dlcStatus.similar_matches && (
            <div style={{ marginTop: "0.5rem" }}>
              <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
                Similar matches found:
              </p>
              <ul
                style={{
                  margin: "0.25rem 0 0 0",
                  paddingLeft: "1.5rem",
                  fontSize: "0.85rem",
                }}
              >
                {dlcStatus.similar_matches.slice(0, 3).map((match, index) => (
                  <li key={index}>
                    {match.artist} - {match.title} (
                    {getOriginDisplay(match.origin)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p
            style={{
              margin: "0.5rem 0 0 0",
              fontSize: "0.85rem",
              fontStyle: "italic",
            }}
          >
            You can still create this song, but consider checking if it's already
            available in the game.
          </p>
        </div>
      </div>
    );
  };

  const renderReleasedWarning = () => {
    if (releasedSongs.length === 0) return null;

    return (
      <div
        style={{
          padding: "0.75rem",
          margin: "0.5rem 0",
          borderRadius: "8px",
          background: "#f8d7da",
          border: "1px solid #f5c2c7",
          fontSize: "0.9rem",
          color: "#721c24",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🚫</span>
          <strong>Already Released on TrackFlow</strong>
        </div>

        <div style={{ marginLeft: "1.5rem" }}>
          {releasedSongs.map((song, index) => (
            <p key={index} style={{ margin: "0.25rem 0" }}>
              This song is already released by{" "}
              <strong>
                <a
                  href={`/profile/${song.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#721c24", textDecoration: "underline" }}
                >
                  {song.display_name || song.username}
                </a>
              </strong>
            </p>
          ))}
        </div>
      </div>
    );
  };

  const renderWipWarning = () => {
    if (wipSongs.length === 0) return null;

    return (
      <div
        style={{
          padding: "0.75rem",
          margin: "0.5rem 0",
          borderRadius: "8px",
          background: "#d1ecf1",
          border: "1px solid #bee5eb",
          fontSize: "0.9rem",
          color: "#0c5460",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>👥</span>
          <strong>Collaboration Opportunity</strong>
        </div>

        <div style={{ marginLeft: "1.5rem" }}>
          {wipSongs.map((song, index) => (
            <div key={index} style={{ margin: "0.5rem 0" }}>
              <p style={{ margin: "0.25rem 0" }}>
                <strong>
                  <a
                    href={`/profile/${song.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0c5460", textDecoration: "underline" }}
                  >
                    {song.display_name || song.username}
                  </a>
                </strong>{" "}
                is already working on this song ({song.status})
              </p>
              <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
                Consider reaching out for a collaboration!{" "}
                <a
                  href={`/community`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0c5460", textDecoration: "underline" }}
                >
                  View public WIP page →
                </a>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderDLCWarning()}
      {renderReleasedWarning()}
      {renderWipWarning()}
    </div>
  );
};

export default DLCWarning;
