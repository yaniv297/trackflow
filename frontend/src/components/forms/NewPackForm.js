import React, { useEffect } from "react";
import { usePackFormState } from "../../hooks/forms/usePackFormState";
import { usePackFormSubmission } from "../../hooks/forms/usePackFormSubmission";
import AlbumSeriesEditModal from "../modals/AlbumSeriesEditModal";
import PackFormFields from "./pack/PackFormFields";
import PackFormActions from "./pack/PackFormActions";
import PackFormProgress from "./pack/PackFormProgress";

function NewPackForm() {
  const {
    mode,
    setMode,
    meta,
    setMeta,
    creationMode,
    setCreationMode,
    entries,
    setEntries,
    isSubmitting,
    setIsSubmitting,
    progress,
    setProgress,
    editSeriesModal,
    setEditSeriesModal,
  } = usePackFormState();

  const { handleSubmit } = usePackFormSubmission(
    mode,
    meta,
    entries,
    creationMode,
    setIsSubmitting,
    setProgress
  );

  // Event listener for opening the album series modal
  useEffect(() => {
    const createHandler = (e) => {
      const { artistName, albumName, status } = e.detail || {};

      setEditSeriesModal({
        open: true,
        packId: null,
        series: [],
        defaultSeriesId: null,
        createMode: true,
        createData: { artistName, albumName, status },
      });
    };

    window.addEventListener("open-create-album-series-modal", createHandler);

    return () => {
      window.removeEventListener(
        "open-create-album-series-modal",
        createHandler
      );
    };
  }, [setEditSeriesModal]);

  const handleOpenEditor = () => {
    if (!meta.albumSeriesArtist || !meta.albumSeriesAlbum) {
      window.showNotification(
        "Please fill in both Artist and Album fields",
        "warning"
      );
      return;
    }

    const event = new CustomEvent("open-create-album-series", {
      detail: {
        artistName: meta.albumSeriesArtist,
        albumName: meta.albumSeriesAlbum,
        status: meta.status,
        skipNavigation: true,
      },
    });
    window.dispatchEvent(event);
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0",
        }}
      >
        <h2
          style={{
            margin: "0 0 2rem 0",
            fontSize: "2rem",
            fontWeight: "600",
            color: "#333",
            textAlign: "center",
          }}
        >
          🎛️ Create New Pack
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <PackFormFields
            mode={mode}
            setMode={setMode}
            meta={meta}
            setMeta={setMeta}
            entries={entries}
            setEntries={setEntries}
            creationMode={creationMode}
            setCreationMode={setCreationMode}
            isSubmitting={isSubmitting}
          />

          <PackFormActions
            mode={mode}
            meta={meta}
            entries={entries}
            creationMode={creationMode}
            isSubmitting={isSubmitting}
            onOpenEditor={handleOpenEditor}
            onSubmit={handleSubmit}
          />

          <PackFormProgress progress={progress} />
        </form>
      </div>

      {/* Edit Album Series Modal */}
      <AlbumSeriesEditModal
        key={`${editSeriesModal.defaultSeriesId}-${editSeriesModal.packId}`}
        isOpen={editSeriesModal.open}
        onClose={() =>
          setEditSeriesModal({
            open: false,
            packId: null,
            series: [],
            defaultSeriesId: null,
            createMode: false,
            createData: null,
          })
        }
        packId={editSeriesModal.packId}
        seriesList={editSeriesModal.series}
        defaultSeriesId={editSeriesModal.defaultSeriesId}
        createMode={editSeriesModal.createMode || false}
        createData={editSeriesModal.createData || null}
        onChanged={() => {
          // Notification is already shown by the modal itself
        }}
      />
    </div>
  );
}

export default NewPackForm;

