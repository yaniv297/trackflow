import React, { useState } from "react";
import BulkActions from "./BulkActions";
import AddSongToPack from "./AddSongToPack";

const PackHeader = ({
  packName,
  validSongsInPack,
  selectedSongs,
  setSelectedSongs,
  collapsedGroups,
  toggleGroup,
  seriesInfo,
  validSeries,
  canMakeDoubleAlbumSeries,
  albumsWithEnoughSongs,
  onMakeDoubleAlbumSeries,
  onShowAlbumSeriesModal,
  onBulkEdit,
  onBulkDelete,
  onBulkEnhance,
  onStartWork,
  onCleanTitles,
  artistImageUrl,
  mostCommonArtist,
  showAlbumSeriesButton,
  status,
  user,
  setShowCollaborationModal,
  setSelectedItemForCollaboration,
  setCollaborationType,
  onSongAdded,
}) => {
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  return (
    <>
      <tr className="group-header">
        {/* First column: select-all checkbox, centered */}
        <td style={{ width: "40px", textAlign: "center" }}>
          <input
            type="checkbox"
            checked={validSongsInPack.every((s) =>
              selectedSongs.includes(s.id)
            )}
            onChange={(e) => {
              const songIds = validSongsInPack.map((s) => s.id);
              if (e.target.checked) {
                setSelectedSongs((prev) => [...new Set([...prev, ...songIds])]);
              } else {
                setSelectedSongs((prev) =>
                  prev.filter((id) => !songIds.includes(id))
                );
              }
            }}
            className="pretty-checkbox"
          />
        </td>

        {/* Second column: expand/collapse, pack name, bulk actions */}
        <td
          colSpan="8"
          style={{
            background: "#f5f5f5",
            fontWeight: "bold",
            padding: "0.7rem 1.2rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.7rem",
            }}
          >
            {artistImageUrl && (
              <img
                src={artistImageUrl}
                alt={mostCommonArtist}
                style={{
                  width: 54,
                  height: 54,
                  objectFit: "cover",
                  borderRadius: "50%",
                  marginRight: 16,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.13)",
                }}
              />
            )}

            <button
              onClick={() => toggleGroup(packName)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
                marginRight: "0.5rem",
              }}
            >
              {collapsedGroups[packName] ? "▶" : "▼"}
            </button>

            <span style={{ flex: 1 }}>
              {validSeries.length === 1 ? (
                <a
                  href={`/album-series/${seriesInfo[0].id}`}
                  style={{
                    textDecoration: "none",
                    color: "#1a237e",
                    display: "inline-flex",
                    alignItems: "center",
                    background: "#e3eaff",
                    borderRadius: "12px",
                    padding: "0.15rem 0.7rem 0.15rem 0.5rem",
                    fontWeight: 600,
                    fontSize: "1.08em",
                    boxShadow: "0 1px 4px rgba(26,35,126,0.07)",
                    transition: "background 0.2s",
                    marginRight: 8,
                  }}
                  title={`Album Series #${seriesInfo[0].number}: ${seriesInfo[0].name}`}
                >
                  <span style={{ fontSize: "1.1em", marginRight: 4 }}>📀</span>
                  Album Series #{seriesInfo[0].number}: {seriesInfo[0].name}
                </a>
              ) : validSeries.length === 2 ? (
                <>
                  {seriesInfo.map((info, idx) => (
                    <a
                      key={info.id}
                      href={`/album-series/${info.id}`}
                      style={{
                        textDecoration: "none",
                        color: "#1a237e",
                        display: "inline-flex",
                        alignItems: "center",
                        background: "#e3eaff",
                        borderRadius: "12px",
                        padding: "0.15rem 0.7rem 0.15rem 0.5rem",
                        fontWeight: 600,
                        fontSize: "1.08em",
                        boxShadow: "0 1px 4px rgba(26,35,126,0.07)",
                        transition: "background 0.2s",
                        marginRight: idx === 0 ? 8 : 0,
                      }}
                      title={`Album Series #${info.number}: ${info.name}`}
                    >
                      <span style={{ fontSize: "1.1em", marginRight: 4 }}>
                        📀
                      </span>
                      Album Series #{info.number}: {info.name}
                    </a>
                  ))}
                </>
              ) : (
                `${packName} (${validSongsInPack.length})`
              )}
            </span>

            {/* Pack-level action buttons */}
            <span
              style={{
                display: "inline-flex",
                gap: "0.4rem",
                marginLeft: "1.2rem",
                verticalAlign: "middle",
              }}
            >
              {/* Create Album Series Button */}
              {showAlbumSeriesButton && (
                <button
                  onClick={onShowAlbumSeriesModal}
                  style={{
                    background: "#4CAF50",
                    color: "white",
                    border: "1px solid #45a049",
                    borderRadius: "6px",
                    padding: "0.28rem 0.9rem",
                    fontWeight: 600,
                    fontSize: "0.98rem",
                    cursor: "pointer",
                    transition: "background 0.2s, border 0.2s",
                  }}
                >
                  🎵 Create Album Series
                </button>
              )}

              {/* Make Double Album Series Button */}
              {canMakeDoubleAlbumSeries && (
                <button
                  onClick={() =>
                    onMakeDoubleAlbumSeries(packName, albumsWithEnoughSongs)
                  }
                  style={{
                    background: "#FF6B35",
                    color: "white",
                    border: "1px solid #E55A2B",
                    borderRadius: "6px",
                    padding: "0.28rem 0.9rem",
                    fontWeight: 600,
                    fontSize: "0.98rem",
                    cursor: "pointer",
                    transition: "background 0.2s, border 0.2s",
                  }}
                  title={`Split "${albumsWithEnoughSongs[1][0]}" into its own album series (${albumsWithEnoughSongs[1][1]} songs)`}
                >
                  🎵🎵 Make Double Album Series
                </button>
              )}

              {/* Add Song Button - Show if user has pack view/edit access */}
              {validSongsInPack[0]?.pack_id && (
                <button
                  onClick={() => setShowAddSongModal(true)}
                  style={{
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    transition: "background 0.2s, transform 0.2s",
                    marginRight: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Add song to this pack"
                  onMouseEnter={(e) => {
                    e.target.style.background = "#0056b3";
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#007bff";
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  +
                </button>
              )}

              {/* Manage Collaborations Button - Only show for Future Plans and pack owners */}
              {status === "Future Plans" &&
                validSongsInPack[0]?.pack_owner_username === user?.username && (
                  <button
                    onClick={() => {
                      setSelectedItemForCollaboration({
                        type: "pack",
                        id: validSongsInPack[0].pack_id,
                        name: packName,
                      });
                      setCollaborationType("pack");
                      setShowCollaborationModal(true);
                    }}
                    style={{
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.28rem 0.9rem",
                      cursor: "pointer",
                      fontSize: "0.98rem",
                      fontWeight: 600,
                      transition: "background 0.2s, border 0.2s",
                    }}
                    title="Manage pack collaborations"
                  >
                    👥 Manage Collaborations
                  </button>
                )}
            </span>

            {/* Bulk actions for this group if any song in the group is selected */}
            {validSongsInPack.some((s) => selectedSongs.includes(s.id)) && (
              <BulkActions
                selectedSongs={selectedSongs}
                onBulkEdit={onBulkEdit}
                onBulkDelete={onBulkDelete}
                onBulkEnhance={onBulkEnhance}
                onStartWork={onStartWork}
                onCleanTitles={onCleanTitles}
                showAlbumSeriesButton={false} // Already shown above
                showDoubleAlbumSeriesButton={false} // Already shown above
                status={status}
              />
            )}
          </span>
        </td>
      </tr>

      {/* Add Song Modal */}
      <AddSongToPack
        isOpen={showAddSongModal}
        onClose={() => setShowAddSongModal(false)}
        packId={validSongsInPack[0]?.pack_id}
        packName={packName}
        onSongAdded={() => {
          setShowAddSongModal(false);
          onSongAdded?.();
        }}
      />
    </>
  );
};

export default PackHeader;
