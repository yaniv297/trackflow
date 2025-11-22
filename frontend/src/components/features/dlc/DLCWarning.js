import React, { useState, useEffect } from "react";
import { checkDLCStatus } from "../../../utils/dlcCheck";

const DLCWarning = ({ title, artist, showWarning = true }) => {
  const [dlcStatus, setDlcStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkDLC = async () => {
      if (!title || !artist || title.length < 2 || artist.length < 2) {
        setDlcStatus(null);
        return;
      }

      setIsLoading(true);
      try {
        const status = await checkDLCStatus(title, artist);
        setDlcStatus(status);
      } catch (error) {
        console.error("Error checking DLC:", error);
        setDlcStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkDLC, 500);
    return () => clearTimeout(timeoutId);
  }, [title, artist]);

  if (!showWarning || !dlcStatus) {
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
        🔍 Checking if this song is already official DLC...
      </div>
    );
  }

  if (!dlcStatus.is_dlc) {
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

export default DLCWarning;
