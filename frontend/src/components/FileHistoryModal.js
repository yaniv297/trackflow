import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

const FileHistoryModal = ({ isOpen, onClose, song, onFileLinkAdded, onFileLinkDeleted }) => {
  const [fileLinks, setFileLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user: currentUser } = useAuth();

  // Load file links when modal opens
  useEffect(() => {
    if (isOpen && song) {
      loadFileLinks();
    }
  }, [isOpen, song]);

  const loadFileLinks = async () => {
    setLoading(true);
    try {
      const response = await apiGet(`/file-links/${song.id}`);
      setFileLinks(response || []);
    } catch (error) {
      console.error("Error loading file links:", error);
      window.showNotification("Failed to load file history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFileLink = async (e) => {
    e.preventDefault();

    if (!newFileUrl.trim() || !newMessage.trim()) {
      window.showNotification(
        "Please fill in both file URL and message",
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost(`/file-links/${song.id}`, {
        file_url: newFileUrl.trim(),
        message: newMessage.trim(),
      });

      // Add new link to the list
      setFileLinks((prev) => [response, ...prev]);

      // Reset form
      setNewFileUrl("");
      setNewMessage("");
      setShowAddForm(false);

      // Notify parent component
      if (onFileLinkAdded) {
        onFileLinkAdded(response);
      }

      window.showNotification("File link added successfully!", "success");
    } catch (error) {
      console.error("Error adding file link:", error);
      window.showNotification("Failed to add file link", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFileLink = async (linkId) => {
    if (!window.confirm("Are you sure you want to delete this file link?")) {
      return;
    }

    try {
      await apiDelete(`/file-links/${linkId}`);

      // Remove from list
      setFileLinks((prev) => prev.filter((link) => link.id !== linkId));
      
      // Notify parent component
      if (onFileLinkDeleted) {
        onFileLinkDeleted(linkId);
      }

      window.showNotification("File link deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting file link:", error);
      window.showNotification("Failed to delete file link", "error");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const openFileUrl = (url) => {
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            borderBottom: "1px solid #eee",
            paddingBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>File History - {song?.title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {/* Add File Link Button */}
        <div style={{ marginBottom: "1rem" }}>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: "#007bff",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              📁 Add File Link
            </button>
          ) : (
            <form onSubmit={handleAddFileLink} style={{ marginBottom: "1rem" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                >
                  File URL (Google Drive, Dropbox, etc.):
                </label>
                <input
                  type="url"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                >
                  Progress Message:
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="e.g., 'Finished drums and bass tracks'"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? "#ccc" : "#007bff",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  {submitting ? "Adding..." : "Add File Link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewFileUrl("");
                    setNewMessage("");
                  }}
                  style={{
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* File Links List */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              Loading file history...
            </div>
          ) : fileLinks.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "2rem", color: "#666" }}
            >
              No file links yet. Add the first one above!
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {fileLinks.map((link) => (
                <div
                  key={link.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: "6px",
                    padding: "1rem",
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#007bff" }}>
                        {link.username}
                      </strong>
                      <span
                        style={{
                          color: "#666",
                          fontSize: "0.8rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {formatDate(link.created_at)}
                      </span>
                    </div>
                    {link.user_id === currentUser?.id && (
                      <button
                        onClick={() => handleDeleteFileLink(link.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#e74c3c",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          padding: "0.25rem",
                        }}
                        title="Delete this file link"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: "0.5rem" }}>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>
                      {link.message}
                    </p>
                  </div>

                  <button
                    onClick={() => openFileUrl(link.file_url)}
                    style={{
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    🔗 Open File
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileHistoryModal;
