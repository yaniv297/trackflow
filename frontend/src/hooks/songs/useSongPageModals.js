import { useState, useEffect } from "react";

/**
 * Custom hook for managing all modal states in SongPage
 */
export const useSongPageModals = () => {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAlbumSeriesModal, setShowAlbumSeriesModal] = useState(false);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [selectedItemForCollaboration, setSelectedItemForCollaboration] =
    useState(null);
  const [collaborationType, setCollaborationType] = useState("pack");
  const [editSeriesModal, setEditSeriesModal] = useState({
    open: false,
    packId: null,
    series: [],
    defaultSeriesId: null,
  });

  // Listen for edit album series event
  useEffect(() => {
    const handler = (e) => {
      const { packId, series } = e.detail || {};
      setEditSeriesModal({
        open: true,
        packId: packId || null,
        series: series || [],
        defaultSeriesId: series?.[0]?.id || null,
      });
    };
    window.addEventListener("open-edit-album-series", handler);
    return () => window.removeEventListener("open-edit-album-series", handler);
  }, []);

  return {
    showBulkModal,
    setShowBulkModal,
    showAlbumSeriesModal,
    setShowAlbumSeriesModal,
    showCollaborationModal,
    setShowCollaborationModal,
    selectedItemForCollaboration,
    setSelectedItemForCollaboration,
    collaborationType,
    setCollaborationType,
    editSeriesModal,
    setEditSeriesModal,
  };
};

