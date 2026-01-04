import React from "react";

/**
 * Component for displaying decade details in a hover popup
 */
const DecadeHoverPopup = ({ decade, decadeValue, count, decadeDetails, loadingDecade }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "-10px",
        transform: "translateX(-50%)",
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "1rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000,
        minWidth: "250px",
      }}
    >
      <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
        {decade} (
        {decadeDetails[decadeValue]?.total_songs || loadingDecade === decadeValue ? "..." : count}{" "}
        songs)
      </h4>

      {loadingDecade === decadeValue ? (
        <div style={{ color: "#666", fontSize: "0.9em" }}>Loading...</div>
      ) : decadeDetails[decadeValue] ? (
        <div>
          {decadeDetails[decadeValue].top_artists.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <strong style={{ fontSize: "0.9em", color: "#666" }}>
                Top Artists:
              </strong>
              <div style={{ fontSize: "0.85em" }}>
                {decadeDetails[decadeValue].top_artists.map(({ artist, count }, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    {decadeDetails[decadeValue].top_artists[idx].artist_image_url && (
                      <img
                        src={
                          decadeDetails[decadeValue].top_artists[idx].artist_image_url
                        }
                        alt={artist}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    <span>{artist}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontWeight: 600,
                        color: "#9b59b6",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decadeDetails[decadeValue].top_albums.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.9em", color: "#666" }}>
                Top Albums:
              </strong>
              <div style={{ fontSize: "0.85em" }}>
                {decadeDetails[decadeValue].top_albums.map(({ album, count }, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    {decadeDetails[decadeValue].top_albums[idx].album_cover && (
                      <img
                        src={decadeDetails[decadeValue].top_albums[idx].album_cover}
                        alt={album}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "4px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <span>{album}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontWeight: 600,
                        color: "#9b59b6",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: "#666", fontSize: "0.9em" }}>
          Hover to load details...
        </div>
      )}
    </div>
  );
};

export default DecadeHoverPopup;

