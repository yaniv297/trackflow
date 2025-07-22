import React from "react";
import EditableCell from "./EditableCell";
import SpotifyEnhancementRow from "./SpotifyEnhancementRow";

export default function SongRow({
  song,
  selected,
  onSelect,
  editing,
  editValues,
  setEditing,
  setEditValues,
  saveEdit,
  fetchSpotifyOptions,
  handleDelete,
  spotifyOptions,
  setSpotifyOptions,
  applySpotifyEnhancement,
}) {
  return (
    <>
      <tr>
        {/* Checkbox */}
        <td>
          <input
            type="checkbox"
            className="pretty-checkbox"
            checked={selected}
            onChange={onSelect}
          />
        </td>

        {/* Album Cover */}
        <td>
          {song.album_cover && (
            <img
              src={song.album_cover}
              alt="cover"
              style={{
                width: "50px",
                height: "50px",
                objectFit: "cover",
              }}
            />
          )}
        </td>

        {/* Editable fields */}
        <EditableCell
          value={song.title}
          songId={song.id}
          field="title"
          editing={editing}
          editValues={editValues}
          setEditing={setEditing}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
        />
        <EditableCell
          value={song.artist}
          songId={song.id}
          field="artist"
          editing={editing}
          editValues={editValues}
          setEditing={setEditing}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
        />
        <EditableCell
          value={song.album}
          songId={song.id}
          field="album"
          editing={editing}
          editValues={editValues}
          setEditing={setEditing}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
        />
        <EditableCell
          value={song.pack}
          songId={song.id}
          field="pack"
          editing={editing}
          editValues={editValues}
          setEditing={setEditing}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
        />

        {/* Status */}
        <td>
          <span className={`status ${song.status.replaceAll(" ", "-")}`}>
            {song.status}
          </span>
        </td>

        {/* Year */}
        <EditableCell
          value={song.year || ""}
          songId={song.id}
          field="year"
          editing={editing}
          editValues={editValues}
          setEditing={setEditing}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
        />

        {/* Enhance + Delete */}
        <td>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            {spotifyOptions[song.id] ? (
              <button
                onClick={() =>
                  setSpotifyOptions((prev) => ({
                    ...prev,
                    [song.id]: undefined,
                  }))
                }
              >
                Cancel
              </button>
            ) : (
              <button onClick={() => fetchSpotifyOptions(song)}>Enhance</button>
            )}
            <button
              onClick={() => handleDelete(song.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "red",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ❌
            </button>
          </div>
        </td>
      </tr>

      {/* Spotify Enhancement Row */}
      <SpotifyEnhancementRow
        songId={song.id}
        options={spotifyOptions[song.id]}
        onApply={applySpotifyEnhancement}
      />
    </>
  );
}
