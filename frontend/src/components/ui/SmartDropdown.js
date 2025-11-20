import React, { useState, useEffect, useRef } from "react";
import { apiGet, apiPost } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";

const SmartDropdown = ({
  type,
  value,
  onChange,
  placeholder,
  onBlur,
  onKeyDown,
  style = {},
  inputStyle = {},
  includeCurrentUser = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { user: currentUser } = useAuth();

  const fetchOptions = async () => {
    setLoading(true);
    try {
      let data = [];

      switch (type) {
        case "artist":
          const artistsResponse = await apiGet("/songs/all-artists");
          data = artistsResponse.data || artistsResponse;
          break;

        case "album":
          const albumsResponse = await apiGet("/songs/");
          const songsList = albumsResponse.data || albumsResponse;
          const uniqueAlbums = [
            ...new Set(songsList.map((song) => song.album).filter(Boolean)),
          ];
          data = uniqueAlbums.map((album) => ({ value: album, label: album }));
          break;

        case "pack":
          const packsResponse = await apiGet("/songs/");
          const packsData = packsResponse.data || packsResponse;
          const uniquePacks = [
            ...new Set(packsData.map((song) => song.pack_name).filter(Boolean)),
          ];
          data = uniquePacks.map((pack) => ({ value: pack, label: pack }));
          break;

        case "collaborations":
        case "users":
          const usersResponse = await apiGet("/auth/users/");
          const users = usersResponse.data || usersResponse;
          // Filter out the current user unless includeCurrentUser is true
          const filteredUsers = includeCurrentUser
            ? users
            : users.filter(
                (user) => !currentUser || user.username !== currentUser.username
              );
          data = filteredUsers.map((user) => ({
            value: user.username,
            label: user.username,
          }));
          break;

        default:
          data = [];
      }

      setOptions(data);
    } catch (error) {
      console.error(`Failed to fetch ${type} options:`, error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && options.length === 0) {
      fetchOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When typing comma-separated values (e.g., collaborators), only filter by the last token
  const currentQuery = (() => {
    if (!value) return "";
    const parts = value.split(",");
    return parts[parts.length - 1].trim().toLowerCase();
  })();

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(currentQuery)
  );

  const handleSelect = (selectedValue) => {
    if (type === "collaborations") {
      // Replace the substring after the last comma (or the whole value if no comma)
      const lastCommaIndex = value.lastIndexOf(",");
      let replaced;
      if (lastCommaIndex === -1) {
        replaced = selectedValue;
      } else {
        const head = value.slice(0, lastCommaIndex).trim().replace(/,\s*$/, "");
        replaced = head ? `${head}, ${selectedValue}` : selectedValue;
      }

      // De-duplicate while preserving order
      const deduped = replaced
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(", ");

      onChange(deduped);
    } else {
      onChange(selectedValue);
    }
    setIsOpen(false);
  };

  const handleAddNew = async () => {
    if (value.trim()) {
      if (type === "users") {
        try {
          // Create the new user first
          await apiPost("/auth/users/", {
            username: value.trim(),
            email: `${value.trim()}@example.com`, // Temporary email
            password: "temp123", // Temporary password
          });

          // User created successfully, now update the value
          onChange(value.trim());
          setIsOpen(false);
          // Refresh the options to include the new user
          fetchOptions();
        } catch (error) {
          console.error("Error creating user:", error);
          // Still update the value even if user creation fails
          // (the backend will handle this gracefully)
          onChange(value.trim());
          setIsOpen(false);
        }
      } else {
        // For other types, just update the value
        onChange(value.trim());
        setIsOpen(false);
      }
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", width: "100%", ...style }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={(e) => {
          setIsOpen(true);
          e.target.style.borderColor = "#007bff";
          e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
        }}
        onBlur={(e) => {
          // Add a small delay to allow click events to complete first
          setTimeout(() => {
            if (onBlur) onBlur(e);
          }, 150);
          e.target.style.borderColor = "#e1e5e9";
          e.target.style.boxShadow = "none";
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          border: "2px solid #e1e5e9",
          borderRadius: "8px",
          fontSize: "1rem",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxSizing: "border-box",
          cursor: "text",
          ...inputStyle,
        }}
      />

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "2px solid #e1e5e9",
            borderRadius: "8px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {loading ? (
            <div
              style={{ padding: "1rem", textAlign: "center", color: "#666" }}
            >
              Loading...
            </div>
          ) : (
            <>
              {/* Existing options */}
              {filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(option.value)}
                  style={{
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "white";
                  }}
                >
                  {option.label}
                </div>
              ))}

              {/* Add new option */}
              {value.trim() &&
                !filteredOptions.some(
                  (opt) => opt.value.toLowerCase() === value.toLowerCase()
                ) && (
                  <div
                    onClick={handleAddNew}
                    style={{
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      backgroundColor: "#e8f5e8",
                      fontWeight: "600",
                      color: "#2d5a2d",
                      borderTop: "1px solid #d4edda",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#d1ecf1";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#e8f5e8";
                    }}
                  >
                    + Add new "{value}"
                  </div>
                )}

              {filteredOptions.length === 0 && !value.trim() && (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  No {type === "users" ? "users" : `${type}s`} found
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartDropdown;
