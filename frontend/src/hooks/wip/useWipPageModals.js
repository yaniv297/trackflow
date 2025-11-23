import { useState, useEffect } from "react";

/**
 * Custom hook for managing all modal states in WipPage
 */
export const useWipPageModals = () => {
  const [showAlbumSeriesModal, setShowAlbumSeriesModal] = useState(false);
  const [albumSeriesForm, setAlbumSeriesForm] = useState({
    artist_name: "",
    album_name: "",
    year: "",
    cover_image_url: "",
    description: "",
  });
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [selectedItemForCollaboration, setSelectedItemForCollaboration] =
    useState(null);
  const [collaborationType, setCollaborationType] = useState("pack");
  const [editSeriesModal, setEditSeriesModal] = useState({
    open: false,
    packId: null,
    series: [],
    defaultSeriesId: null,
    createMode: false,
    createData: null,
  });
  const [showDoubleAlbumSeriesModal, setShowDoubleAlbumSeriesModal] =
    useState(false);
  const [doubleAlbumSeriesData, setDoubleAlbumSeriesData] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseModalData, setReleaseModalData] = useState(null);
  const [isExecutingDoubleAlbumSeries, setIsExecutingDoubleAlbumSeries] =
    useState(false);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
  });

  // Listen for edit album series events
  useEffect(() => {
    // If a pending request exists (set by NewPackForm), open the editor on mount
    try {
      const raw = localStorage.getItem("tf_open_edit_series");
      if (raw) {
        const detail = JSON.parse(raw);
        if (
          detail &&
          detail.packId &&
          detail.series &&
          detail.series.length > 0
        ) {
          const evt = new CustomEvent("open-edit-album-series", { detail });
          window.dispatchEvent(evt);
        }
        localStorage.removeItem("tf_open_edit_series");
      }
    } catch (_e) {
      // ignore
    }

    const handler = (e) => {
      const { packId, series } = e.detail || {};
      setEditSeriesModal({
        open: true,
        packId: packId || null,
        series: series || [],
        defaultSeriesId: series?.[0]?.id || null,
      });
    };

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

    window.addEventListener("open-edit-album-series", handler);
    window.addEventListener("open-create-album-series-modal", createHandler);

    return () => {
      window.removeEventListener("open-edit-album-series", handler);
      window.removeEventListener(
        "open-create-album-series-modal",
        createHandler
      );
    };
  }, []);

  return {
    showAlbumSeriesModal,
    setShowAlbumSeriesModal,
    albumSeriesForm,
    setAlbumSeriesForm,
    showCollaborationModal,
    setShowCollaborationModal,
    selectedItemForCollaboration,
    setSelectedItemForCollaboration,
    collaborationType,
    setCollaborationType,
    editSeriesModal,
    setEditSeriesModal,
    showDoubleAlbumSeriesModal,
    setShowDoubleAlbumSeriesModal,
    doubleAlbumSeriesData,
    setDoubleAlbumSeriesData,
    showReleaseModal,
    setShowReleaseModal,
    releaseModalData,
    setReleaseModalData,
    isExecutingDoubleAlbumSeries,
    setIsExecutingDoubleAlbumSeries,
    alertConfig,
    setAlertConfig,
  };
};

