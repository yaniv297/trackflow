// SpotifyEnhancementRow.js
import React from "react";

export default function SpotifyEnhancementRow({ songId, options, onApply }) {
  if (!options || options.length === 0) return null;

  return (
    <tr>
      <td colSpan="9">
        <div className="spotify-options">
          {options.map((opt) => (
            <div key={opt.track_id} className="spotify-option">
              <img
                src={opt.album_cover}
                alt="cover"
                style={{ width: 40, marginRight: 10 }}
              />
              <strong>{opt.title}</strong> – {opt.artist} <br />
              <em>{opt.album}</em>
              <button
                style={{ marginLeft: 10 }}
                onClick={() => onApply(songId, opt.track_id)}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}
