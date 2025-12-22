import React, { useState, useEffect, useRef, useMemo } from "react";

const DEFAULT_COLUMNS = {
  cover: { label: "Cover", enabled: true, required: true },
  title: { label: "Title", enabled: true, required: true },
  artist: { label: "Artist", enabled: true, required: false },
  album: { label: "Album", enabled: true, required: false },
  pack: { label: "Pack", enabled: true, required: false },
  author: { label: "Owner", enabled: true, required: false },
  year: { label: "Year", enabled: true, required: false },
  notes: { label: "Notes", enabled: true, required: false },
  collaborations: { label: "Collaborations", enabled: true, required: false },
  visibility: { label: "Visibility", enabled: true, required: false },
  actions: { label: "Actions", enabled: true, required: true },
};

const ColumnSelector = ({ onColumnChange, groupBy, status }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const dropdownRef = useRef(null);

  // Load saved column preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('songTableColumns');
    if (saved) {
      try {
        const savedColumns = JSON.parse(saved);
        setColumns({ ...DEFAULT_COLUMNS, ...savedColumns });
      } catch (e) {
        console.warn('Failed to parse saved column preferences:', e);
      }
    }
  }, []);

  // Filter out columns that shouldn't be shown based on groupBy or status
  const getVisibleColumns = useMemo(() => {
    const visibleColumns = { ...columns };
    
    // Hide artist column when grouped by artist
    if (groupBy === "artist") {
      visibleColumns.artist = { ...visibleColumns.artist, groupHidden: true };
    }
    
    // Hide pack column when grouped by pack
    if (groupBy === "pack") {
      visibleColumns.pack = { ...visibleColumns.pack, groupHidden: true };
    }
    
    // Hide visibility column for released songs (only relevant for future plans)
    if (status === "Released") {
      visibleColumns.visibility = { ...visibleColumns.visibility, groupHidden: true };
    }
    
    return visibleColumns;
  }, [columns, groupBy, status]);

  // Save column preferences when they change
  useEffect(() => {
    localStorage.setItem('songTableColumns', JSON.stringify(columns));
  }, [columns]);

  // Notify parent of visible columns (including status-based hiding) when they change
  useEffect(() => {
    if (onColumnChange) {
      onColumnChange(getVisibleColumns);
    }
  }, [getVisibleColumns, onColumnChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (columnKey) => {
    if (columns[columnKey].required) return; // Don't allow toggling required columns
    
    setColumns(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        enabled: !prev[columnKey].enabled
      }
    }));
  };

  const resetToDefaults = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  const visibleColumns = getVisibleColumns;
  const enabledCount = Object.values(visibleColumns).filter(col => 
    col.enabled && !col.groupHidden
  ).length;

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "6px",
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#e9ecef";
          e.target.style.borderColor = "#adb5bd";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#f8f9fa";
          e.target.style.borderColor = "#dee2e6";
        }}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/>
        </svg>
        Columns ({enabledCount})
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          style={{ 
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "0",
            background: "white",
            border: "1px solid #dee2e6",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: "220px",
            padding: "8px 0",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #eee",
              marginBottom: "4px",
              fontWeight: "600",
              fontSize: "0.9rem",
              color: "#333",
            }}
          >
            Select Columns to Display
          </div>

          {Object.entries(visibleColumns).map(([key, column]) => {
            const isDisabled = column.required || column.groupHidden;
            const isEnabled = column.enabled && !column.groupHidden;
            
            return (
              <div
                key={key}
                onClick={() => !isDisabled && toggleColumn(key)}
                style={{
                  padding: "8px 16px",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "white",
                  opacity: isDisabled ? 0.5 : 1,
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "white";
                }}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={isDisabled}
                  onChange={() => {}} // Controlled by onClick
                  style={{
                    margin: 0,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                />
                <span style={{ fontSize: "0.9rem" }}>
                  {column.label}
                  {column.required && (
                    <span style={{ color: "#6c757d", fontSize: "0.8rem" }}> (required)</span>
                  )}
                  {column.groupHidden && (
                    <span style={{ color: "#6c757d", fontSize: "0.8rem" }}> (hidden by grouping)</span>
                  )}
                </span>
              </div>
            );
          })}

          <div
            style={{
              borderTop: "1px solid #eee",
              marginTop: "4px",
              padding: "8px 16px",
            }}
          >
            <button
              onClick={resetToDefaults}
              style={{
                background: "none",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "0.8rem",
                color: "#6c757d",
                width: "100%",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f8f9fa";
                e.target.style.borderColor = "#adb5bd";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "#dee2e6";
              }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;