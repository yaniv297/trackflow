import React from "react";
import CommentItem from "./CommentItem";

function CommentSection({
  comments,
  user,
  requestId,
  expanded,
  onToggleExpand,
  commentText,
  onCommentTextChange,
  replyingTo,
  onReply,
  onAddComment,
  submittingComment,
  editingComment,
  editCommentText,
  onEditComment,
  onDeleteComment,
  onSaveEditComment,
  onCancelEditComment,
  onEditTextChange,
  organizeComments,
}) {
  const renderReplies = (replies, depth = 0) => {
    if (!replies || replies.length === 0) return null;

    return (
      <div
        style={{
          marginLeft: "2rem",
          marginBottom: "0.5rem",
        }}
      >
        {replies.map((reply) => (
          <div key={reply.id}>
            <CommentItem
              comment={reply}
              user={user}
              editingComment={editingComment}
              editCommentText={editCommentText}
              replyingTo={replyingTo[requestId]}
              onEdit={onEditComment}
              onDelete={(commentId) => onDeleteComment(requestId, commentId)}
              onReply={(commentId) =>
                onReply(requestId, commentId === replyingTo[requestId] ? null : commentId)
              }
              onSaveEdit={(commentId) => onSaveEditComment(requestId, commentId)}
              onCancelEdit={onCancelEditComment}
              onEditTextChange={onEditTextChange}
              requestId={requestId}
              isReply={true}
            />

            {/* Reply form for this reply */}
            {replyingTo[requestId] === reply.id && (
              <div
                style={{
                  marginLeft: "0",
                  marginBottom: "0.5rem",
                  padding: "0.75rem",
                  background: "#fff",
                  borderRadius: "4px",
                  border: "1px solid #dee2e6",
                }}
              >
                <textarea
                  value={commentText[requestId] || ""}
                  onChange={(e) => onCommentTextChange(requestId, e.target.value)}
                  placeholder={`Reply to ${reply.username}...`}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    marginBottom: "0.5rem",
                  }}
                  disabled={submittingComment[requestId]}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => onAddComment(requestId, reply.id)}
                    disabled={
                      submittingComment[requestId] || !commentText[requestId]?.trim()
                    }
                    style={{
                      padding: "0.4rem 0.8rem",
                      background:
                        submittingComment[requestId] || !commentText[requestId]?.trim()
                          ? "#ccc"
                          : "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor:
                        submittingComment[requestId] || !commentText[requestId]?.trim()
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {submittingComment[requestId] ? "Posting..." : "Post Reply"}
                  </button>
                  <button
                    onClick={() => {
                      onReply(requestId, null);
                      onCommentTextChange(requestId, "");
                    }}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recursively render nested replies */}
            {reply.replies && reply.replies.length > 0 && renderReplies(reply.replies, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  const organizedComments = organizeComments(comments || []);

  return (
    <div
      style={{
        borderTop: "1px solid #eee",
        paddingTop: "1rem",
        marginTop: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <button
          onClick={onToggleExpand}
          style={{
            background: "none",
            border: "none",
            color: "#007bff",
            cursor: "pointer",
            fontSize: "0.9rem",
            padding: 0,
          }}
        >
          {expanded ? "Hide" : "Show"} Comments ({comments?.length || 0})
        </button>
      </div>

      {expanded && (
        <div>
          {/* Comments List */}
          {organizedComments.length > 0 && (
            <div
              style={{
                marginBottom: "1rem",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              {organizedComments.map((comment) => (
                <div key={comment.id}>
                  <CommentItem
                    comment={comment}
                    user={user}
                    editingComment={editingComment}
                    editCommentText={editCommentText}
                    replyingTo={replyingTo[requestId]}
                    onEdit={onEditComment}
                    onDelete={(commentId) => onDeleteComment(requestId, commentId)}
                    onReply={(commentId) =>
                      onReply(
                        requestId,
                        commentId === replyingTo[requestId] ? null : commentId
                      )
                    }
                    onSaveEdit={(commentId) => onSaveEditComment(requestId, commentId)}
                    onCancelEdit={onCancelEditComment}
                    onEditTextChange={onEditTextChange}
                    requestId={requestId}
                    isReply={false}
                  />

                  {/* Replies - recursively rendered */}
                  {comment.replies && comment.replies.length > 0 && renderReplies(comment.replies)}

                  {/* Reply form for this comment */}
                  {replyingTo[requestId] === comment.id && (
                    <div
                      style={{
                        marginLeft: "2rem",
                        marginBottom: "0.5rem",
                        padding: "0.75rem",
                        background: "#fff",
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                      }}
                    >
                      <textarea
                        value={commentText[requestId] || ""}
                        onChange={(e) => onCommentTextChange(requestId, e.target.value)}
                        placeholder={`Reply to ${comment.username}...`}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "0.9rem",
                          fontFamily: "inherit",
                          resize: "vertical",
                          boxSizing: "border-box",
                          marginBottom: "0.5rem",
                        }}
                        disabled={submittingComment[requestId]}
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => onAddComment(requestId, comment.id)}
                          disabled={
                            submittingComment[requestId] || !commentText[requestId]?.trim()
                          }
                          style={{
                            padding: "0.4rem 0.8rem",
                            background:
                              submittingComment[requestId] || !commentText[requestId]?.trim()
                                ? "#ccc"
                                : "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            cursor:
                              submittingComment[requestId] || !commentText[requestId]?.trim()
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {submittingComment[requestId] ? "Posting..." : "Post Reply"}
                        </button>
                        <button
                          onClick={() => {
                            onReply(requestId, null);
                            onCommentTextChange(requestId, "");
                          }}
                          style={{
                            padding: "0.4rem 0.8rem",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form (only show if not replying to a specific comment) */}
          {!replyingTo[requestId] && (
            <div>
              <textarea
                value={commentText[requestId] || ""}
                onChange={(e) => onCommentTextChange(requestId, e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: "0.5rem",
                }}
                disabled={submittingComment[requestId]}
              />
              <button
                onClick={() => onAddComment(requestId)}
                disabled={submittingComment[requestId] || !commentText[requestId]?.trim()}
                style={{
                  padding: "0.5rem 1rem",
                  background:
                    submittingComment[requestId] || !commentText[requestId]?.trim()
                      ? "#ccc"
                      : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  cursor:
                    submittingComment[requestId] || !commentText[requestId]?.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {submittingComment[requestId] ? "Posting..." : "Post Comment"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CommentSection;

