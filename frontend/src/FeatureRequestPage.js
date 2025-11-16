import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "./utils/api";
import FeatureRequestCard from "./components/FeatureRequestCard";
import FeatureRequestForm from "./components/FeatureRequestForm";

function FeatureRequestPage() {
  const { user } = useAuth();
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [replyingTo, setReplyingTo] = useState({});
  const [expandedCompleted, setExpandedCompleted] = useState({});
  const [sortBy, setSortBy] = useState("upvotes");
  const [editingComment, setEditingComment] = useState({});
  const [editingRequest, setEditingRequest] = useState({});
  const [editCommentText, setEditCommentText] = useState({});
  const [editRequestTitle, setEditRequestTitle] = useState({});
  const [editRequestDescription, setEditRequestDescription] = useState({});

  useEffect(() => {
    loadFeatureRequests();
  }, [sortBy]);

  const loadFeatureRequests = async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/feature-requests/?sort_by=${sortBy}`);
      setFeatureRequests(data);
    } catch (error) {
      console.error("Failed to load feature requests:", error);
      window.showNotification(
        "Failed to load feature requests. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      window.showNotification(
        "Please fill in both title and description",
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/feature-requests/", {
        title: newTitle.trim(),
        description: newDescription.trim(),
      });

      window.showNotification("Feature request created!", "success");
      setNewTitle("");
      setNewDescription("");
      setShowCreateForm(false);
      loadFeatureRequests();
    } catch (error) {
      console.error("Failed to create feature request:", error);
      window.showNotification(
        "Failed to create feature request. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (requestId, voteType) => {
    try {
      const updated = await apiPost(`/feature-requests/${requestId}/vote`, {
        vote_type: voteType,
      });
      setFeatureRequests((prev) =>
        prev.map((fr) => (fr.id === requestId ? updated : fr))
      );
    } catch (error) {
      console.error("Failed to vote:", error);
      window.showNotification("Failed to vote. Please try again.", "error");
    }
  };

  const handleAddComment = async (requestId, parentCommentId = null) => {
    const comment = commentText[requestId]?.trim();
    if (!comment) {
      window.showNotification("Please enter a comment", "error");
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [requestId]: true }));
    try {
      await apiPost(`/feature-requests/${requestId}/comments`, {
        comment: comment,
        parent_comment_id: parentCommentId,
      });

      window.showNotification("Comment added!", "success");
      setCommentText((prev) => ({ ...prev, [requestId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [requestId]: null }));
      loadFeatureRequests();
    } catch (error) {
      console.error("Failed to add comment:", error);
      window.showNotification(
        "Failed to add comment. Please try again.",
        "error"
      );
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const organizeComments = (comments) => {
    const topLevel = comments.filter((c) => !c.parent_comment_id);
    const allReplies = comments.filter((c) => c.parent_comment_id);

    const repliesMap = {};
    allReplies.forEach((reply) => {
      const parentId = reply.parent_comment_id;
      if (!repliesMap[parentId]) {
        repliesMap[parentId] = [];
      }
      repliesMap[parentId].push(reply);
    });

    const buildReplies = (commentId) => {
      const directReplies = repliesMap[commentId] || [];
      return directReplies.map((reply) => ({
        ...reply,
        replies: buildReplies(reply.id),
      }));
    };

    return topLevel.map((comment) => ({
      ...comment,
      replies: buildReplies(comment.id),
    }));
  };

  const handleMarkDone = async (requestId, currentStatus) => {
    try {
      const updated = await apiPatch(
        `/feature-requests/${requestId}/mark-done`,
        {
          is_done: !currentStatus,
        }
      );

      setFeatureRequests((prev) =>
        prev.map((fr) => (fr.id === requestId ? updated : fr))
      );

      window.showNotification(
        updated.is_done
          ? "Feature marked as done!"
          : "Feature marked as not done!",
        "success"
      );
    } catch (error) {
      console.error("Failed to mark feature as done:", error);
      window.showNotification(
        "Failed to update feature status. Please try again.",
        "error"
      );
    }
  };

  const handleEditRequest = async (requestId) => {
    const title = editRequestTitle[requestId]?.trim();
    const description = editRequestDescription[requestId]?.trim();

    if (!title || !description) {
      window.showNotification("Title and description are required", "error");
      return;
    }

    try {
      const updated = await apiPatch(`/feature-requests/${requestId}`, {
        title,
        description,
      });

      setFeatureRequests((prev) =>
        prev.map((fr) => (fr.id === requestId ? updated : fr))
      );

      setEditingRequest((prev) => ({ ...prev, [requestId]: false }));
      setEditRequestTitle((prev) => ({ ...prev, [requestId]: "" }));
      setEditRequestDescription((prev) => ({ ...prev, [requestId]: "" }));

      window.showNotification("Feature request updated!", "success");
    } catch (error) {
      console.error("Failed to update feature request:", error);
      window.showNotification(
        "Failed to update feature request. Please try again.",
        "error"
      );
    }
  };

  const handleEditComment = async (requestId, commentId) => {
    const comment = editCommentText[commentId]?.trim();

    if (!comment) {
      window.showNotification("Comment cannot be empty", "error");
      return;
    }

    try {
      await apiPatch(`/feature-requests/${requestId}/comments/${commentId}`, {
        comment,
      });

      loadFeatureRequests();

      setEditingComment((prev) => ({ ...prev, [commentId]: false }));
      setEditCommentText((prev) => ({ ...prev, [commentId]: "" }));

      window.showNotification("Comment updated!", "success");
    } catch (error) {
      console.error("Failed to update comment:", error);
      window.showNotification(
        "Failed to update comment. Please try again.",
        "error"
      );
    }
  };

  const handleDeleteComment = async (requestId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await apiDelete(`/feature-requests/${requestId}/comments/${commentId}`);

      loadFeatureRequests();

      window.showNotification("Comment deleted!", "success");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      window.showNotification(
        "Failed to delete comment. Please try again.",
        "error"
      );
    }
  };

  const getNetVotes = (request) => {
    return Math.max(0, request.upvotes - request.downvotes);
  };

  const handleToggleExpand = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  const handleStartEditRequest = (requestId) => {
    const request = featureRequests.find((r) => r.id === requestId);
    if (request) {
      setEditingRequest((prev) => ({ ...prev, [requestId]: true }));
      setEditRequestTitle((prev) => ({ ...prev, [requestId]: request.title }));
      setEditRequestDescription((prev) => ({
        ...prev,
        [requestId]: request.description,
      }));
    }
  };

  const handleCancelEditRequest = (requestId) => {
    setEditingRequest((prev) => ({ ...prev, [requestId]: false }));
    setEditRequestTitle((prev) => ({ ...prev, [requestId]: "" }));
    setEditRequestDescription((prev) => ({ ...prev, [requestId]: "" }));
  };

  const handleEditTextChange = (type, requestId, value) => {
    if (type === "title") {
      setEditRequestTitle((prev) => ({ ...prev, [requestId]: value }));
    } else if (type === "description") {
      setEditRequestDescription((prev) => ({ ...prev, [requestId]: value }));
    }
  };

  const handleEditCommentClick = (commentId) => {
    const comment = featureRequests
      .flatMap((r) => r.comments || [])
      .find((c) => c.id === commentId);
    if (comment) {
      setEditingComment((prev) => ({ ...prev, [commentId]: true }));
      setEditCommentText((prev) => ({ ...prev, [commentId]: comment.comment }));
    }
  };

  const handleCancelEditComment = (commentId) => {
    setEditingComment((prev) => ({ ...prev, [commentId]: false }));
    setEditCommentText((prev) => ({ ...prev, [commentId]: "" }));
  };

  const handleEditCommentTextChange = (commentId, value) => {
    setEditCommentText((prev) => ({ ...prev, [commentId]: value }));
  };

  const handleSaveEditComment = (requestId, commentId) => {
    handleEditComment(requestId, commentId);
  };

  const handleReply = (requestId, commentId) => {
    setReplyingTo((prev) => ({ ...prev, [requestId]: commentId }));
  };

  const handleCommentTextChange = (requestId, value) => {
    setCommentText((prev) => ({ ...prev, [requestId]: value }));
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          fontSize: "1.2rem",
          color: "#666",
        }}
      >
        Loading feature requests...
      </div>
    );
  }

  const activeRequests = featureRequests.filter((r) => !r.is_done);
  const completedRequests = featureRequests.filter((r) => r.is_done);

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Feature Requests</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.9rem",
              cursor: "pointer",
              background: "white",
            }}
          >
            <option value="upvotes">Most Upvoted</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="comments">Most Comments</option>
            <option value="activity">Most Recent Activity</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: "0.75rem 1.5rem",
              background: showCreateForm ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            {showCreateForm ? "Cancel" : "+ New Request"}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>
            Create Feature Request
          </h2>
          <FeatureRequestForm
            title={newTitle}
            description={newDescription}
            onTitleChange={setNewTitle}
            onDescriptionChange={setNewDescription}
            onSubmit={handleCreateRequest}
            onCancel={() => setShowCreateForm(false)}
            submitting={submitting}
            submitLabel="Create Request"
            cancelLabel="Cancel"
          />
        </div>
      )}

      {featureRequests.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "3rem",
            textAlign: "center",
            color: "#666",
          }}
        >
          <p style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
            No feature requests yet. Be the first to suggest a feature!
          </p>
        </div>
      ) : (
        <>
          {/* Active Feature Requests */}
          {activeRequests.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              {activeRequests.map((request) => (
                <FeatureRequestCard
                  key={request.id}
                  request={request}
                  user={user}
                  expandedRequest={expandedRequest}
                  onToggleExpand={handleToggleExpand}
                  onVote={handleVote}
                  getNetVotes={getNetVotes}
                  editingRequest={editingRequest}
                  editRequestTitle={editRequestTitle}
                  editRequestDescription={editRequestDescription}
                  onEditRequest={handleEditRequest}
                  onCancelEditRequest={handleCancelEditRequest}
                  onStartEditRequest={handleStartEditRequest}
                  onMarkDone={handleMarkDone}
                  commentText={commentText}
                  onCommentTextChange={handleCommentTextChange}
                  replyingTo={replyingTo}
                  onReply={handleReply}
                  onAddComment={handleAddComment}
                  submittingComment={submittingComment}
                  editingComment={editingComment}
                  editCommentText={editCommentText}
                  onEditComment={handleEditCommentClick}
                  onDeleteComment={handleDeleteComment}
                  onSaveEditComment={handleSaveEditComment}
                  onCancelEditComment={handleCancelEditComment}
                  onEditTextChange={handleEditTextChange}
                  organizeComments={organizeComments}
                />
              ))}
            </div>
          )}

          {/* Completed Feature Requests */}
          {completedRequests.length > 0 && (
            <div style={{ marginTop: "3rem" }}>
              <h2 style={{ marginBottom: "1rem", color: "#6c757d" }}>
                ✅ Completed Features
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {completedRequests.map((request) => {
                  const isExpanded = expandedCompleted[request.id];
                  return (
                    <div
                      key={request.id}
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        padding: isExpanded ? "1.5rem" : "1rem",
                        transition: "all 0.2s",
                      }}
                    >
                      {!isExpanded ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setExpandedCompleted((prev) => ({
                              ...prev,
                              [request.id]: true,
                            }))
                          }
                        >
                          <div style={{ flex: 1 }}>
                            <h3
                              style={{
                                margin: 0,
                                color: "#6c757d",
                                fontSize: "1rem",
                                fontWeight: "500",
                              }}
                            >
                              ✅ {request.title}
                            </h3>
                            <p
                              style={{
                                color: "#999",
                                fontSize: "0.85rem",
                                margin: "0.25rem 0 0 0",
                              }}
                            >
                              by {request.username} •{" "}
                              {new Date(
                                request.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div
                            style={{
                              color: "#6c757d",
                              fontSize: "0.9rem",
                              marginLeft: "1rem",
                            }}
                          >
                            ▼ Click to expand
                          </div>
                        </div>
                      ) : (
                        <FeatureRequestCard
                          request={request}
                          user={user}
                          expandedRequest={expandedRequest}
                          onToggleExpand={handleToggleExpand}
                          onVote={handleVote}
                          getNetVotes={getNetVotes}
                          editingRequest={editingRequest}
                          editRequestTitle={editRequestTitle}
                          editRequestDescription={editRequestDescription}
                          onEditRequest={handleEditRequest}
                          onCancelEditRequest={handleCancelEditRequest}
                          onStartEditRequest={handleStartEditRequest}
                          onMarkDone={handleMarkDone}
                          commentText={commentText}
                          onCommentTextChange={handleCommentTextChange}
                          replyingTo={replyingTo}
                          onReply={handleReply}
                          onAddComment={handleAddComment}
                          submittingComment={submittingComment}
                          editingComment={editingComment}
                          editCommentText={editCommentText}
                          onEditComment={handleEditCommentClick}
                          onDeleteComment={handleDeleteComment}
                          onSaveEditComment={handleSaveEditComment}
                          onCancelEditComment={handleCancelEditComment}
                          onEditTextChange={handleEditTextChange}
                          organizeComments={organizeComments}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FeatureRequestPage;
