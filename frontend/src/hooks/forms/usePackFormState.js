import { useState } from "react";

/**
 * Hook for managing pack form state
 */
export const usePackFormState = () => {
  const [mode, setMode] = useState("artist"); // "artist" or "mixed"
  const [meta, setMeta] = useState({
    pack: "",
    artist: "",
    status: "Future Plans",
    priority: null,
    isAlbumSeries: false,
    albumSeriesArtist: "",
    albumSeriesAlbum: "",
    openEditorAfterCreate: false,
  });
  const [creationMode, setCreationMode] = useState("manual"); // 'manual' | 'wizard'
  const [entries, setEntries] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ phase: "", current: 0, total: 0 });
  const [editSeriesModal, setEditSeriesModal] = useState({
    open: false,
    packId: null,
    series: [],
    defaultSeriesId: null,
    createMode: false,
    createData: null,
  });

  return {
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
  };
};

