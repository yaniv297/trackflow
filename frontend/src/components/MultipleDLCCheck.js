import React, { useState, useEffect } from "react";
import { checkDLCStatus } from "../utils/dlcCheck";

const MultipleDLCCheck = ({ songsText, mode, artistName }) => {
  const [dlcMatches, setDlcMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkMultipleDLC = async () => {
      if (!songsText || songsText.trim().length < 5) {
        setDlcMatches([]);
        return;
      }

      setIsLoading(true);
      try {
        const lines = songsText.split("\n").filter((line) => line.trim());
        const matches = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let title, artist;

          if (mode === "artist") {
            // In artist mode, each line is just a song title
            title = trimmed;
            artist = artistName; // Use the artist name from the form
          } else {
            // In mixed mode, parse "Artist - Title" format
            const dashIndex = trimmed.indexOf(" - ");
            const enDashIndex = trimmed.indexOf(" – ");

            let separatorIndex = -1;
            if (dashIndex !== -1 && enDashIndex !== -1) {
              separatorIndex = Math.min(dashIndex, enDashIndex);
            } else if (dashIndex !== -1) {
              separatorIndex = dashIndex;
            } else if (enDashIndex !== -1) {
              separatorIndex = enDashIndex;
            }

            if (separatorIndex > 0) {
              artist = trimmed.substring(0, separatorIndex).trim();
              title = trimmed.substring(separatorIndex + 3).trim();
            } else {
              continue; // Invalid format
            }
          }

          if (title && artist) {
            const status = await checkDLCStatus(title, artist);
            if (status.is_dlc) {
              matches.push({
                line: trimmed,
                title,
                artist,
                origin: status.origin,
                match_type: status.match_type,
              });
            }
          } else if (mode === "artist" && !artistName) {
            // Skip DLC checking if we're in artist mode but don't have an artist name
            continue;
          }
        }

        setDlcMatches(matches);
      } catch (error) {
        console.error("Error checking multiple DLC:", error);
        setDlcMatches([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkMultipleDLC, 1000);
    return () => clearTimeout(timeoutId);
  }, [songsText, mode, artistName]);

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
        🔍 Checking songs against official DLC database...
      </div>
    );
  }

  if (dlcMatches.length === 0) {
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
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>⚠️</span>
        <strong>Official Rock Band DLC Detected</strong>
      </div>

      <div style={{ marginLeft: "1.5rem" }}>
        <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
          The following songs are already available as official Rock Band
          content:
        </p>
        <ul
          style={{
            margin: "0.5rem 0 0 0",
            paddingLeft: "1.5rem",
            fontSize: "0.85rem",
          }}
        >
          {dlcMatches.slice(0, 5).map((match, index) => (
            <li key={index}>
              <strong>
                {match.artist} - {match.title}
              </strong>{" "}
              ({getOriginDisplay(match.origin)})
            </li>
          ))}
        </ul>
        {dlcMatches.length > 5 && (
          <p
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: "0.8rem",
              fontStyle: "italic",
            }}
          >
            ... and {dlcMatches.length - 5} more
          </p>
        )}
        <p
          style={{
            margin: "0.5rem 0 0 0",
            fontSize: "0.85rem",
            fontStyle: "italic",
          }}
        >
          You can still create these songs, but consider checking if they're
          already available in the game.
        </p>
      </div>
    </div>
  );
};

export default MultipleDLCCheck;
