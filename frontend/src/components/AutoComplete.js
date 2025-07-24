import React, { useState, useEffect, useRef } from "react";

import { API_BASE_URL } from "../config";

const AutoComplete = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  type, // 'artist', 'album', or 'collaborator'
  style = {},
  autoFocus = false,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const endpoint =
        type === "artist"
          ? "artists"
          : type === "album"
          ? "albums"
          : "collaborators";

      const response = await fetch(
        `${API_BASE_URL}/songs/autocomplete/${endpoint}?query=${encodeURIComponent(
          query
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1); // Reset selection when typing
    onChange(e); // Call parent onChange

    // Fetch suggestions
    fetchSuggestions(newValue);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);

    // Create a synthetic event for the parent onChange
    const syntheticEvent = {
      target: { value: suggestion },
    };
    onChange(syntheticEvent);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === "Enter") {
      if (showSuggestions && suggestions.length > 0 && selectedIndex >= 0) {
        // Only auto-select if user has explicitly navigated to a suggestion
        e.preventDefault();
        const selectedSuggestion = suggestions[selectedIndex];
        handleSuggestionClick(selectedSuggestion);
      } else {
        // Otherwise, just save whatever the user typed
        if (onKeyDown) {
          onKeyDown(e);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      // Let the parent handle escape (which should cancel the edit)
      if (onKeyDown) {
        onKeyDown(e);
      }
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleBlur = (e) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
    if (onBlur) onBlur(e);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          fontSize: "0.85rem",
          padding: "2px 4px",
          ...style,
        }}
        autoFocus={autoFocus}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.85rem",
                borderBottom:
                  index < suggestions.length - 1 ? "1px solid #eee" : "none",
                backgroundColor: index === selectedIndex ? "#e3f2fd" : "white",
                ":hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
              onMouseEnter={(e) => {
                setSelectedIndex(index);
                e.target.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor =
                  index === selectedIndex ? "#e3f2fd" : "white";
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoComplete;
