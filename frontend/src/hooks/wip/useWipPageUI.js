import { useState } from "react";

/**
 * Custom hook for managing WipPage UI state
 */
export const useWipPageUI = () => {
  const [viewMode, setViewMode] = useState("pack"); // "pack" or "completion"
  const [searchQuery, setSearchQuery] = useState("");
  const [newSongData, setNewSongData] = useState({});
  const [showAddForm, setShowAddForm] = useState(null);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [fireworksTrigger, setFireworksTrigger] = useState(0);

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    newSongData,
    setNewSongData,
    showAddForm,
    setShowAddForm,
    selectedSongs,
    setSelectedSongs,
    fireworksTrigger,
    setFireworksTrigger,
  };
};

