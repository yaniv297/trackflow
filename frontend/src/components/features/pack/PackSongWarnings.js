import React from "react";
import { apiPost } from "../../../utils/api";

/**
 * Component to display warnings for bulk song entries in pack creation
 * Shows: Already Released warnings, Collaboration Opportunities
 * Note: DLC warnings are handled separately by MultipleDLCCheck component
 */
const PackSongWarnings = ({
  songsText,
  mode,
  artistName,
  showWarning = true,
}) => {
  const [warnings, setWarnings] = React.useState({
    released: [],
    collaboration: [],
  });
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!showWarning || !songsText || songsText.trim().length === 0) {
      setWarnings({ released: [], collaboration: [] });
      return;
    }

    const checkSongs = async () => {
      setIsLoading(true);
      try {
        // Parse songs from text
        const lines = songsText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          setWarnings({ released: [], collaboration: [] });
          return;
        }

        // Prepare songs for bulk check
        const songsToCheck = [];
        for (const line of lines) {
          if (mode === "artist") {
            // In artist mode, each line is just a title
            if (artistName) {
              songsToCheck.push({
                title: line,
                artist: artistName,
              });
            }
          } else {
            // In mixed mode, parse "Artist - Title" format
            const dashIndex = line.indexOf(" - ");
            const enDashIndex = line.indexOf(" – ");

            let separatorIndex = -1;
            if (dashIndex !== -1 && enDashIndex !== -1) {
              separatorIndex = Math.min(dashIndex, enDashIndex);
            } else if (dashIndex !== -1) {
              separatorIndex = dashIndex;
            } else if (enDashIndex !== -1) {
              separatorIndex = enDashIndex;
            }

            if (separatorIndex > 0) {
              const artist = line.substring(0, separatorIndex).trim();
              const title = line.substring(separatorIndex + 3).trim();
              if (artist && title) {
                songsToCheck.push({ title, artist });
              }
            }
          }
        }

        if (songsToCheck.length === 0) {
          setWarnings({ released: [], collaboration: [] });
          return;
        }

        // Call bulk validation endpoint
        const response = await apiPost(
          "/api/public-songs/check-duplicates-batch",
          {
            songs: songsToCheck,
          }
        );

        // Aggregate warnings by type
        const releasedSongs = [];
        const collaborationOpportunities = [];

        response.forEach((result, index) => {
          const songLine = lines[index] || `${result.artist} - ${result.title}`;

          // Check TrackFlow matches (DLC is handled separately by MultipleDLCCheck)
          if (result.trackflow_matches && result.trackflow_matches.length > 0) {
            result.trackflow_matches.forEach((match) => {
              if (match.status === "Released") {
                // Avoid duplicates - check if this song is already in releasedSongs
                const exists = releasedSongs.some(
                  (s) => s.artist === result.artist && s.title === result.title
                );
                if (!exists) {
                  releasedSongs.push({
                    artist: result.artist,
                    title: result.title,
                    line: songLine,
                    ownerUsername: match.username,
                    ownerDisplayName: match.display_name || match.username,
                    songId: match.id,
                  });
                }
              } else if (
                match.status === "In Progress" ||
                match.status === "Future Plans"
              ) {
                // Avoid duplicates - check if this song is already in collaborationOpportunities
                const exists = collaborationOpportunities.some(
                  (s) =>
                    s.artist === result.artist &&
                    s.title === result.title &&
                    s.ownerUsername === match.username
                );
                if (!exists) {
                  collaborationOpportunities.push({
                    artist: result.artist,
                    title: result.title,
                    line: songLine,
                    ownerUsername: match.username,
                    ownerDisplayName: match.display_name || match.username,
                    status: match.status,
                    songId: match.id,
                  });
                }
              }
            });
          }
        });

        // Sort to maintain original order
        releasedSongs.sort((a, b) => {
          const aIdx = lines.indexOf(a.line);
          const bIdx = lines.indexOf(b.line);
          return aIdx - bIdx;
        });

        collaborationOpportunities.sort((a, b) => {
          const aIdx = lines.indexOf(a.line);
          const bIdx = lines.indexOf(b.line);
          return aIdx - bIdx;
        });

        setWarnings({
          released: releasedSongs,
          collaboration: collaborationOpportunities,
        });
      } catch (error) {
        console.error("Error checking song warnings:", error);
        setWarnings({ released: [], collaboration: [] });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkSongs, 1000);
    return () => clearTimeout(timeoutId);
  }, [songsText, mode, artistName, showWarning]);

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
        🔍 Checking songs for warnings...
      </div>
    );
  }

  const hasWarnings =
    warnings.released.length > 0 || warnings.collaboration.length > 0;

  if (!showWarning || !hasWarnings) {
    return null;
  }

  return (
    <div>
      {/* Collaboration Opportunity Alert (shown first) */}
      {warnings.collaboration.length > 0 && (
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
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>👥</span>
            <strong>Collaboration Opportunity</strong>
          </div>
          <div style={{ marginLeft: "1.5rem" }}>
            <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
              The following songs are already being worked on by other users:
            </p>
            <ul
              style={{
                margin: "0.5rem 0 0 0",
                paddingLeft: "1.5rem",
                fontSize: "0.85rem",
              }}
            >
              {warnings.collaboration.map((song, idx) => (
                <li key={idx} style={{ margin: "0.25rem 0" }}>
                  <strong>
                    {song.artist} - {song.title}
                  </strong>{" "}
                  -{" "}
                  <a
                    href={`/profile/${song.ownerUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#0c5460",
                      textDecoration: "underline",
                    }}
                  >
                    {song.ownerDisplayName}
                  </a>{" "}
                  is already working on this song ({song.status})
                </li>
              ))}
            </ul>
            <p
              style={{
                margin: "0.5rem 0 0 0",
                fontSize: "0.85rem",
                fontStyle: "italic",
              }}
            >
              Consider reaching out for a collaboration!{" "}
              <a
                href={`/community`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#0c5460",
                  textDecoration: "underline",
                }}
              >
                View public WIP page →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Already Released Alert */}
      {warnings.released.length > 0 && (
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
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🚫</span>
            <strong>Already Released on TrackFlow</strong>
          </div>
          <div style={{ marginLeft: "1.5rem" }}>
            <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
              The following songs are already released by TrackFlow users:
            </p>
            <ul
              style={{
                margin: "0.5rem 0 0 0",
                paddingLeft: "1.5rem",
                fontSize: "0.85rem",
              }}
            >
              {warnings.released.map((song, idx) => (
                <li key={idx} style={{ margin: "0.25rem 0" }}>
                  <strong>
                    {song.artist} - {song.title}
                  </strong>{" "}
                  - released by{" "}
                  <a
                    href={`/profile/${song.ownerUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#721c24",
                      textDecoration: "underline",
                    }}
                  >
                    {song.ownerDisplayName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackSongWarnings;

