import React from "react";

/**
 * Component for displaying Spotify enhancement options
 */
const SpotifyEnhancement = ({ 
  spotifyOptions, 
  onEnhanceFromSpotify, 
  onClearOptions 
}) => {
  if (spotifyOptions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {spotifyOptions.map((opt) => (
        <div
          key={opt.track_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.4rem 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <img
            src={opt.album_cover}
            alt="cover"
            style={{
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: 4,
              flexShrink: 0,
            }}
          />
          <div style={{ flexGrow: 1 }}>
            <strong>{opt.title}</strong> – {opt.artist}
            <br />
            <em>{opt.album}</em>
          </div>
          <button
            onClick={() => {
              onEnhanceFromSpotify(opt.track_id);
              onClearOptions(); // hide options after apply
            }}
            style={{
              padding: "0.4rem 0.8rem",
              backgroundColor: "#1DB954",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Apply
          </button>
        </div>
      ))}
    </div>
  );
};

export default SpotifyEnhancement;