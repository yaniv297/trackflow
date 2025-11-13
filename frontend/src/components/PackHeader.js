import React, { useState } from "react";
import AddSongToPack from "./AddSongToPack";

const dropdownItemStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "block",
  width: "100%",
  padding: "0.5rem 1rem",
  textAlign: "left",
  color: "#5a8fcf",
  fontSize: "0.9rem",
};

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
  onPackNameUpdate,
  onDeletePack,
}) => {
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [showPackActions, setShowPackActions] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newPackName, setNewPackName] = useState(packName);

  const submitRename = async () => {
    try {
      if (!newPackName.trim() || newPackName.trim() === packName) {
        setRenameModalOpen(false);
        return;
      }
      await onPackNameUpdate(validSongsInPack[0]?.pack_id, newPackName.trim());
      setRenameModalOpen(false);
    } catch (e) {
      console.error("Rename failed", e);
      setRenameModalOpen(false);
    }
  };

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

        {/* Second column: expand/collapse, pack name, dropdown actions */}
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
              width: "100%",
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
              aria-label="Toggle pack"
            >
              {collapsedGroups[packName] ? "▶" : "▼"}
            </button>

            {/* Album series badges: show multiple if provided; otherwise fallback to pack name */}
            {(() => {
              if (Array.isArray(seriesInfo) && seriesInfo.length > 0) {
                return (
                  <span
                    style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}
                  >
                    {seriesInfo.map((info) => {
                      const num = info?.number ?? "";
                      const name = info?.name ?? "Album Series";
                      const id = info?.id;
                      const displayText = num
                        ? `Album Series #${num}: ${name}`
                        : `Album Series: ${name}`;
                      return (
                        <a
                          key={String(id)}
                          href={id ? `/album-series/${id}` : undefined}
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
                          }}
                          title={displayText}
                        >
                          <span style={{ fontSize: "1.1em", marginRight: 6 }}>
                            📀
                          </span>
                          {displayText}
                        </a>
                      );
                    })}
                  </span>
                );
              }
              return (
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  {packName} ({validSongsInPack.length})
                </span>
              );
            })()}

            {/* Gear dropdown right next to pack name (no pencil) */}
            {(() => {
              // Check if user owns any songs in this pack
              const userOwnedSongs = validSongsInPack.filter(
                (song) => song.user_id === user?.id
              );
              const isPackOwner = userOwnedSongs.length > 0;

              // Check if user has pack edit collaboration via pack_collaboration field
              const hasPackEditPermission =
                user &&
                validSongsInPack.some(
                  (song) =>
                    song.pack_collaboration && 
                    song.pack_collaboration.can_edit === true
                );

              return isPackOwner || hasPackEditPermission;
            })() && (
              <span
                style={{ position: "relative", marginLeft: "0.4rem" }}
                data-pack-actions-dropdown
              >
                <button
                  onClick={() => setShowPackActions((v) => !v)}
                  style={{
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Pack actions"
                  onMouseEnter={(e) => (e.target.style.background = "#0056b3")}
                  onMouseLeave={(e) => (e.target.style.background = "#007bff")}
                >
                  ⚙️
                </button>

                {showPackActions && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "white",
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      zIndex: 1000,
                      minWidth: 220,
                      padding: "0.5rem 0",
                    }}
                  >
                    {/* Edit Pack Name */}
                    <button
                      onClick={() => {
                        setNewPackName(packName);
                        setRenameModalOpen(true);
                        setShowPackActions(false);
                      }}
                      style={dropdownItemStyle}
                    >
                      ✏️ Edit Pack Name
                    </button>

                    {/* Start Work */}
                    {status === "Future Plans" && (
                      <button
                        onClick={() => {
                          onStartWork(validSongsInPack.map((s) => s.id));
                          setShowPackActions(false);
                        }}
                        style={dropdownItemStyle}
                      >
                        🔨 Start Work
                      </button>
                    )}

                    {/* Add Song */}
                    {validSongsInPack[0]?.pack_id && (
                      <button
                        onClick={() => {
                          setShowAddSongModal(true);
                          setShowPackActions(false);
                        }}
                        style={dropdownItemStyle}
                      >
                        ＋ Add Song
                      </button>
                    )}

                    {/* Collaborations */}
                    <button
                      onClick={() => {
                        if (setShowCollaborationModal) {
                          const packId = validSongsInPack[0]?.pack_id;
                          setShowCollaborationModal(true);
                          setSelectedItemForCollaboration &&
                            setSelectedItemForCollaboration({
                              id: packId,
                              name: packName,
                            });
                          setCollaborationType && setCollaborationType("pack");
                        }
                        setShowPackActions(false);
                      }}
                      style={dropdownItemStyle}
                    >
                      👥 Collaborations
                    </button>

                    {/* Bulk Options */}
                    <button
                      onClick={() => {
                        onBulkEdit && onBulkEdit();
                        setShowPackActions(false);
                      }}
                      style={dropdownItemStyle}
                    >
                      📋 Bulk Options
                    </button>

                    {/* Album Series actions */}
                    {(() => {
                      const hasAlbumSeries = validSongsInPack.some(
                        (s) => s.album_series_id
                      );
                      const uniqueSongSeriesCount = new Set(
                        validSongsInPack
                          .map((s) => s && s.album_series_id)
                          .filter(
                            (id) => id !== null && id !== undefined && id !== ""
                          )
                          .map((id) =>
                            typeof id === "string" ? parseInt(id, 10) : id
                          )
                          .filter((id) => Number.isInteger(id))
                      ).size;
                      const isAlreadyDouble =
                        (Array.isArray(validSeries)
                          ? validSeries.length
                          : uniqueSongSeriesCount) >= 2;
                      const canCreate =
                        !hasAlbumSeries &&
                        albumsWithEnoughSongs &&
                        albumsWithEnoughSongs.length >= 1;
                      const canSplitDouble =
                        hasAlbumSeries &&
                        !isAlreadyDouble &&
                        albumsWithEnoughSongs &&
                        albumsWithEnoughSongs.length >= 2;
                      return (
                        <>
                          {/* Edit album series is always available when we have any series */}
                          {hasAlbumSeries && (
                            <button
                              onClick={() => {
                                // fire an event to parent to open modal; we'll use a custom event for now
                                const event = new CustomEvent(
                                  "open-edit-album-series",
                                  {
                                    detail: {
                                      packName,
                                      packId: validSongsInPack[0]?.pack_id,
                                      series: (seriesInfo || []).map(
                                        (info) => ({
                                          id: info.id,
                                          number: info.number,
                                          name: info.name,
                                        })
                                      ),
                                    },
                                  }
                                );
                                window.dispatchEvent(event);
                                setShowPackActions(false);
                              }}
                              style={dropdownItemStyle}
                            >
                              ✏️ Edit Album Series
                            </button>
                          )}
                          {canCreate && (
                            <button
                              onClick={() => {
                                onShowAlbumSeriesModal(
                                  packName,
                                  albumsWithEnoughSongs
                                );
                                setShowPackActions(false);
                              }}
                              style={dropdownItemStyle}
                            >
                              🎵 Make Album Series
                            </button>
                          )}
                          {canSplitDouble && (
                            <button
                              onClick={() => {
                                onMakeDoubleAlbumSeries(
                                  packName,
                                  albumsWithEnoughSongs
                                );
                                setShowPackActions(false);
                              }}
                              style={dropdownItemStyle}
                            >
                              🎵🎵 Make Double Album Series
                            </button>
                          )}
                        </>
                      );
                    })()}

                    {/* Separator */}
                    <div
                      style={{
                        borderTop: "1px solid #eee",
                        margin: "0.5rem 0",
                      }}
                    ></div>

                    {/* Delete Pack */}
                    <button
                      onClick={() => {
                        const packId = validSongsInPack[0]?.pack_id;
                        if (packId && onDeletePack) {
                          onDeletePack(packName, packId);
                        }
                        setShowPackActions(false);
                      }}
                      style={{
                        ...dropdownItemStyle,
                        color: "#dc3545",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#fff5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      🗑️ Delete Pack
                    </button>
                  </div>
                )}
              </span>
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
          onSongAdded && onSongAdded();
          setShowAddSongModal(false);
        }}
      />

      {/* Rename Pack Modal */}
      {renameModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setRenameModalOpen(false)}
        >
          <div
            style={{
              background: "white",
              padding: "1rem",
              borderRadius: 8,
              minWidth: 360,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Edit Pack Name</h3>
            <input
              type="text"
              value={newPackName}
              onChange={(e) => setNewPackName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: 6,
              }}
              autoFocus
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                onClick={() => setRenameModalOpen(false)}
                style={{
                  background: "#6c757d",
                  color: "#fff",
                  border: 0,
                  padding: "0.4rem 0.8rem",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                style={{
                  background: "#007bff",
                  color: "#fff",
                  border: 0,
                  padding: "0.4rem 0.8rem",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PackHeader;
