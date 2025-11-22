import React from "react";

function CommentItem({
  comment,
  user,
  editingComment,
  editCommentText,
  replyingTo,
  onEdit,
  onDelete,
  onReply,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  requestId,
  isReply = false,
}) {
  const renderUsername = (username, isAdmin, fontSize = "0.9rem") => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <strong style={{ fontSize, color: "#333" }}>{username}</strong>
        {isAdmin && (
          <span
            style={{
              fontSize: fontSize === "0.9rem" ? "0.7rem" : "0.65rem",
              background: "#dc3545",
              color: "white",
              padding: "0.15rem 0.4rem",
              borderRadius: "3px",
              fontWeight: "600",
              textTransform: "uppercase",
            }}
            title="Admin"
          >
            Admin
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "0.75rem",
        background: isReply ? "#e9ecef" : "#f8f9fa",
        borderRadius: "4px",
        marginBottom: "0.5rem",
        borderLeft: isReply ? "3px solid #007bff" : "none",
      }}
    >
      {/* Parent comment reference box for replies */}
      {isReply && comment.parent_comment_username && (
        <div
          style={{
            padding: "0.5rem",
            background: "#fff",
            borderRadius: "4px",
            marginBottom: "0.5rem",
            border: "1px solid #dee2e6",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6c757d",
              marginBottom: "0.25rem",
            }}
          >
            Replying to <strong>{comment.parent_comment_username}</strong>:
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "#495057",
              fontStyle: "italic",
              maxHeight: "60px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {comment.parent_comment_text}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.25rem",
        }}
      >
        {renderUsername(
          comment.username,
          comment.is_admin,
          isReply ? "0.85rem" : "0.9rem"
        )}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          {!comment.is_deleted &&
            (comment.user_id === user?.id || user?.is_admin) &&
            !editingComment[comment.id] && (
              <>
                {comment.user_id === user?.id && (
                  <button
                    onClick={() => onEdit(comment.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6c757d",
                      cursor: "pointer",
                      fontSize: isReply ? "0.7rem" : "0.75rem",
                      padding: "0.25rem 0.5rem",
                    }}
                    title="Edit comment"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => onDelete(comment.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc3545",
                    cursor: "pointer",
                    fontSize: isReply ? "0.7rem" : "0.75rem",
                    padding: "0.25rem 0.5rem",
                  }}
                  title={
                    comment.user_id === user?.id
                      ? "Delete your comment"
                      : "Delete comment (admin)"
                  }
                >
                  🗑️
                </button>
              </>
            )}
          {!comment.is_deleted && (
            <button
              onClick={() => onReply(comment.id)}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                cursor: "pointer",
                fontSize: isReply ? "0.75rem" : "0.8rem",
                padding: "0.25rem 0.5rem",
              }}
            >
              {replyingTo === comment.id ? "Cancel" : "Reply"}
            </button>
          )}
          <span
            style={{
              fontSize: isReply ? "0.8rem" : "0.85rem",
              color: comment.is_deleted ? "#999" : "#666",
            }}
          >
            {new Date(comment.created_at).toLocaleString()}
            {comment.is_edited && !comment.is_deleted && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontStyle: "italic",
                  color: "#999",
                }}
              >
                (edited)
              </span>
            )}
            {comment.is_deleted && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontStyle: "italic",
                  color: "#999",
                }}
              >
                (deleted)
              </span>
            )}
          </span>
        </div>
      </div>

      {!comment.is_deleted && editingComment[comment.id] ? (
        <div>
          <textarea
            value={editCommentText[comment.id] ?? comment.comment}
            onChange={(e) => onEditTextChange(comment.id, e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: isReply ? "0.85rem" : "0.9rem",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
              marginBottom: "0.5rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => onSaveEdit(comment.id)}
              style={{
                padding: "0.4rem 0.8rem",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: isReply ? "0.8rem" : "0.85rem",
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => onCancelEdit(comment.id)}
              style={{
                padding: "0.4rem 0.8rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: isReply ? "0.8rem" : "0.85rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            color: comment.is_deleted ? "#999" : "#333",
            fontSize: isReply ? "0.85rem" : "0.9rem",
            whiteSpace: "pre-wrap",
            fontStyle: comment.is_deleted ? "italic" : "normal",
          }}
        >
          {comment.comment}
        </p>
      )}
    </div>
  );
}

export default CommentItem;

