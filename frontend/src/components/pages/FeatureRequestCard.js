import React from "react";
import FeatureRequestVoteButtons from "../shared/FeatureRequestVoteButtons";
import FeatureRequestForm from "../forms/FeatureRequestForm";
import CommentSection from "../features/comments/CommentSection";

function FeatureRequestCard({
  request,
  user,
  expandedRequest,
  onToggleExpand,
  onVote,
  getNetVotes,
  editingRequest,
  editRequestTitle,
  editRequestDescription,
  onEditRequest,
  onCancelEditRequest,
  onStartEditRequest,
  onMarkDone,
  onMarkRejected,
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
  onEditCommentTextChange,
  onDeleteRequest,
  organizeComments,
}) {
  const isInactive = request.is_done || request.is_rejected;
  const statusPrefix = request.is_rejected ? "🚫 " : request.is_done ? "✅ " : "";

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
        }}
      >
        {/* Voting Section */}
        <FeatureRequestVoteButtons
          request={request}
          onVote={onVote}
          getNetVotes={getNetVotes}
        />

        {/* Content Section */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <div style={{ flex: 1 }}>
              {editingRequest[request.id] ? (
                <FeatureRequestForm
                  title={editRequestTitle[request.id] ?? request.title}
                  description={editRequestDescription[request.id] ?? request.description}
                  onTitleChange={(value) =>
                    onEditTextChange("title", request.id, value)
                  }
                  onDescriptionChange={(value) =>
                    onEditTextChange("description", request.id, value)
                  }
                  onSubmit={(e) => {
                    e.preventDefault();
                    onEditRequest(request.id);
                  }}
                  onCancel={() => onCancelEditRequest(request.id)}
                  submitting={false}
                  submitLabel="Save"
                  cancelLabel="Cancel"
                />
              ) : (
                <>
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "0.5rem",
                      color: request.is_rejected
                        ? "#b42318"
                        : request.is_done
                        ? "#6c757d"
                        : "#333",
                      cursor: "pointer",
                      textDecoration: isInactive ? "line-through" : "none",
                      opacity: isInactive ? 0.75 : 1,
                    }}
                    onClick={() => onToggleExpand(request.id)}
                  >
                    {statusPrefix}
                    {request.title}
                  </h3>
                  <p
                    style={{
                      color: "#666",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    by {request.username} •{" "}
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                  {request.is_rejected && (
                    <div
                      style={{
                        color: "#b42318",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                      }}
                    >
                      🚫 Not planned / rejected
                    </div>
                  )}
                </>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginLeft: "1rem",
              }}
            >
              {!editingRequest[request.id] && request.user_id === user?.id && !request.is_done && !request.is_rejected && (
                <button
                  onClick={() => onStartEditRequest(request.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  title="Edit feature request"
                >
                  ✏️ Edit
                </button>
              )}
              {/* Show "Mark Done" and "Reject" only for active (not done, not rejected) requests */}
              {user?.is_admin && !request.is_done && !request.is_rejected && (
                <>
                  <button
                    onClick={() => onMarkDone(request.id, request.is_done)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                    title="Mark as done"
                  >
                    Mark Done
                  </button>
                  <button
                    onClick={() => onMarkRejected(request.id, request.is_rejected)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#b42318",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                    title="Mark as not planned"
                  >
                    Reject
                  </button>
                </>
              )}
              {/* Show "Reopen" for completed or rejected requests */}
              {user?.is_admin && (request.is_done || request.is_rejected) && (
                <button
                  onClick={() => {
                    if (request.is_done) {
                      onMarkDone(request.id, true);
                    } else {
                      onMarkRejected(request.id, true);
                    }
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  title="Reopen feature request"
                >
                  ↺ Reopen
                </button>
              )}
              {(user?.is_admin || request.user_id === user?.id) && (
                <button
                  onClick={() => onDeleteRequest(request.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  title="Delete feature request"
                >
                  🗑 Delete
                </button>
              )}
            </div>
          </div>
          {!editingRequest[request.id] && (
            <>
              <p
                style={{
                  color: "#333",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  marginBottom: "1rem",
                }}
              >
                {request.description}
              </p>
              {request.is_rejected && request.rejection_reason && (
                <div
                  style={{
                    background: "#fff5f5",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    padding: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      color: "#991b1b",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    🚫 Rejection Reason:
                  </div>
                  <div
                    style={{
                      color: "#7f1d1d",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {request.rejection_reason}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Comments Section */}
          <CommentSection
            comments={request.comments}
            user={user}
            requestId={request.id}
            expanded={expandedRequest === request.id}
            onToggleExpand={() => onToggleExpand(request.id)}
            commentText={commentText}
            onCommentTextChange={onCommentTextChange}
            replyingTo={replyingTo}
            onReply={onReply}
            onAddComment={onAddComment}
            submittingComment={submittingComment}
            editingComment={editingComment}
            editCommentText={editCommentText}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onSaveEditComment={onSaveEditComment}
            onCancelEditComment={onCancelEditComment}
            onEditTextChange={onEditCommentTextChange}
            organizeComments={organizeComments}
          />
        </div>
      </div>
    </div>
  );
}

export default FeatureRequestCard;

