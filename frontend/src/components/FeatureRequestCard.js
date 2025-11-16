import React from "react";
import FeatureRequestVoteButtons from "./FeatureRequestVoteButtons";
import FeatureRequestForm from "./FeatureRequestForm";
import CommentSection from "./CommentSection";

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
                      color: request.is_done ? "#6c757d" : "#333",
                      cursor: "pointer",
                      textDecoration: request.is_done ? "line-through" : "none",
                      opacity: request.is_done ? 0.7 : 1,
                    }}
                    onClick={() => onToggleExpand(request.id)}
                  >
                    {request.is_done && "✅ "}
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
              {!editingRequest[request.id] && request.user_id === user?.id && (
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
              {user?.is_admin && (
                <button
                  onClick={() => onMarkDone(request.id, request.is_done)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: request.is_done ? "#6c757d" : "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  title={request.is_done ? "Mark as not done" : "Mark as done"}
                >
                  {request.is_done ? "✓ Done" : "Mark Done"}
                </button>
              )}
            </div>
          </div>
          {!editingRequest[request.id] && (
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
            onEditTextChange={onEditTextChange}
            organizeComments={organizeComments}
          />
        </div>
      </div>
    </div>
  );
}

export default FeatureRequestCard;

