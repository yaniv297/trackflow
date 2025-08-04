import React, { useState, useEffect } from "react";
import { apiGet } from "../utils/api";

const UserDropdown = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus = false,
  placeholder = "Select users...",
  style = {},
  currentUser = null,
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [showNewUserInput, setShowNewUserInput] = useState(false);

  // Load all users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const data = await apiGet("/auth/users/");

        setUsers(data);
      } catch (error) {
        console.error("UserDropdown: Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Parse current selections
  const currentSelections = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
    : [];

  // Filter users based on search term, exclude already selected, and exclude current user
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !currentSelections.includes(user.username) &&
      (!currentUser || user.username !== currentUser.username)
  );

  const handleUserSelect = (username) => {
    const newSelections = [...currentSelections, username];
    const newValue = newSelections.join(", ");

    const syntheticEvent = {
      target: { value: newValue },
    };

    onChange(syntheticEvent);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleNewUserAdd = () => {
    if (newUserName.trim() && !currentSelections.includes(newUserName.trim())) {
      const newSelections = [...currentSelections, newUserName.trim()];
      const newValue = newSelections.join(", ");

      const syntheticEvent = {
        target: { value: newValue },
      };
      onChange(syntheticEvent);
      setNewUserName("");
      setShowNewUserInput(false);
      setShowDropdown(false);
    }
  };

  const handleRemoveUser = (usernameToRemove) => {
    const newSelections = currentSelections.filter(
      (u) => u !== usernameToRemove
    );
    const newValue = newSelections.join(", ");

    const syntheticEvent = {
      target: { value: newValue },
    };
    onChange(syntheticEvent);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Selected Users Display */}
      <div
        style={{
          minHeight: "2.5rem",
          padding: "0.5rem",
          border: "2px solid #e1e5e9",
          borderRadius: "8px",
          backgroundColor: "#fff",
          cursor: "text",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.25rem",
          alignItems: "center",
          ...style,
        }}
        onClick={() => setShowDropdown(true)}
      >
        {currentSelections.map((username, index) => (
          <span
            key={index}
            style={{
              background: "#007bff",
              color: "white",
              padding: "0.25rem 0.5rem",
              borderRadius: "12px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            {username}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveUser(username);
              }}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "0.7rem",
                padding: "0",
                marginLeft: "0.25rem",
              }}
            >
              ×
            </button>
          </span>
        ))}
        {currentSelections.length === 0 && (
          <span style={{ color: "#999", fontSize: "0.9rem" }}>
            {loading ? "Loading users..." : placeholder}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #e1e5e9",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto",
            marginTop: "0.25rem",
          }}
        >
          {/* Search Input */}
          <div
            style={{ padding: "0.75rem", borderBottom: "1px solid #e1e5e9" }}
          >
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              autoFocus
            />
          </div>

          {/* User List */}
          {filteredUsers.length > 0 && (
            <div>
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserSelect(user.username);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "0.9rem",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "white";
                  }}
                >
                  {user.username}
                </div>
              ))}
            </div>
          )}

          {/* Add New User Option */}
          <div
            onClick={() => setShowNewUserInput(true)}
            style={{
              padding: "0.75rem 1rem",
              cursor: "pointer",
              backgroundColor: "#f8f9fa",
              borderTop: "2px solid #e1e5e9",
              fontSize: "0.9rem",
              fontWeight: "600",
              color: "#007bff",
              textAlign: "center",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e3f2fd";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
          >
            ➕ Add New User
          </div>
        </div>
      )}

      {/* New User Input Modal */}
      {showNewUserInput && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #e1e5e9",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            padding: "1rem",
            marginTop: "0.25rem",
          }}
        >
          <div style={{ marginBottom: "0.75rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Add New User
            </label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter username..."
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNewUserAdd();
                } else if (e.key === "Escape") {
                  setShowNewUserInput(false);
                  setNewUserName("");
                }
              }}
              autoFocus
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => {
                setShowNewUserInput(false);
                setNewUserName("");
              }}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "#f8f9fa",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleNewUserAdd}
              disabled={!newUserName.trim()}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "4px",
                backgroundColor: newUserName.trim() ? "#007bff" : "#ccc",
                color: "white",
                cursor: newUserName.trim() ? "pointer" : "not-allowed",
                fontSize: "0.85rem",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => {
            setShowDropdown(false);
            setShowNewUserInput(false);
            setSearchTerm("");
            setNewUserName("");
          }}
        />
      )}
    </div>
  );
};

export default UserDropdown;
