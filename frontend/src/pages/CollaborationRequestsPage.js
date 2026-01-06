import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import collaborationRequestsService from '../services/collaborationRequestsService';
import { useUserProfilePopup } from '../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../components/shared/UserProfilePopup';
import CustomAlert from '../components/ui/CustomAlert';
import './CollaborationRequestsPage.css';

const CollaborationRequestsPage = () => {
  const [receivedBatches, setReceivedBatches] = useState([]);
  const [sentBatches, setSentBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('received');
  const [responding, setResponding] = useState({});
  const [expandedBatches, setExpandedBatches] = useState(new Set());
  const [batchDecisions, setBatchDecisions] = useState({}); // batch_id -> { request_id: 'approved'|'rejected' }
  const [packPermissions, setPackPermissions] = useState({}); // batch_id -> boolean
  const [deleteAlert, setDeleteAlert] = useState({
    isOpen: false,
    batchId: null,
    requestId: null,
    isBatch: false,
  });
  const { isAuthenticated } = useAuth();
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCollaborationRequests();
    }
  }, [isAuthenticated]);

  const fetchCollaborationRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [receivedResult, sentResult] = await Promise.all([
        collaborationRequestsService.getReceivedBatches(),
        collaborationRequestsService.getSentBatches()
      ]);
      
      if (receivedResult.success && sentResult.success) {
        setReceivedBatches(receivedResult.data?.batches || []);
        setSentBatches(sentResult.data?.batches || []);
      } else {
        const errorMsg = receivedResult.error || sentResult.error || 'Failed to load collaboration requests';
        setError(errorMsg);
      }
      
    } catch (error) {
      console.error('Failed to fetch collaboration requests:', error);
      setError('Failed to load collaboration requests');
    } finally {
      setLoading(false);
    }
  };

  // Handle single request response (for unbatched requests)
  // batchId is the "fake" batch id (0 for unbatched) used to look up pack permissions state
  const handleSingleResponse = async (requestId, action, batchId = 0, message = '') => {
    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      // Get pack permissions state for this unbatched request (uses batch_id 0 as key)
      const grantFullPackPermissions = action === 'accepted' ? (packPermissions[batchId] || false) : false;
      
      const result = await collaborationRequestsService.respondToRequest(requestId, {
        response: action,
        message: message || (action === 'accepted' ? 'Request accepted' : 'Request declined'),
        grantFullPackPermissions
      });
      
      if (result.success) {
        await fetchCollaborationRequests();
        const successMsg = grantFullPackPermissions 
          ? `Collaboration request ${action} with full pack permissions!`
          : `Collaboration request ${action} successfully!`;
        window.showNotification && window.showNotification(successMsg, 'success');
        
        // Clear pack permissions state
        setPackPermissions(prev => {
          const next = { ...prev };
          delete next[batchId];
          return next;
        });
      } else {
        window.showNotification && window.showNotification(
          result.error || `Failed to ${action} request. Please try again.`, 
          'error'
        );
      }
      
    } catch (error) {
      console.error(`Failed to ${action} collaboration request:`, error);
      window.showNotification && window.showNotification(
        `Failed to ${action} request. Please try again.`, 
        'error'
      );
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Handle batch response (approve all, reject all, or selective)
  const handleBatchResponse = async (batchId, action) => {
    try {
      setResponding(prev => ({ ...prev, [`batch_${batchId}`]: true }));
      
      const grantFullPackPermissions = packPermissions[batchId] || false;
      let result;
      
      if (action === 'approve_all' || action === 'reject_all') {
        result = await collaborationRequestsService.respondToBatch(batchId, {
          action,
          responseMessage: action === 'approve_all' ? 'Requests approved' : 'Requests declined',
          grantFullPackPermissions: action === 'approve_all' ? grantFullPackPermissions : false
        });
      } else if (action === 'selective') {
        const decisions = batchDecisions[batchId] || {};
        result = await collaborationRequestsService.respondToBatch(batchId, {
          action: 'selective',
          responseMessage: 'Selective approval',
          decisions,
          grantFullPackPermissions
        });
      }
      
      if (result.success) {
        await fetchCollaborationRequests();
        
        const msg = action === 'approve_all' 
          ? `All requests approved${grantFullPackPermissions ? ' with full pack permissions' : ''}!`
          : action === 'reject_all'
          ? 'All requests declined.'
          : `Requests processed: ${result.data.approved_count} approved, ${result.data.rejected_count} rejected`;
        
        window.showNotification && window.showNotification(msg, 'success');
        
        // Clear state for this batch
        setExpandedBatches(prev => {
          const next = new Set(prev);
          next.delete(batchId);
          return next;
        });
        setBatchDecisions(prev => {
          const next = { ...prev };
          delete next[batchId];
          return next;
        });
        setPackPermissions(prev => {
          const next = { ...prev };
          delete next[batchId];
          return next;
        });
      } else {
        window.showNotification && window.showNotification(
          result.error || 'Failed to process request. Please try again.', 
          'error'
        );
      }
      
    } catch (error) {
      console.error('Failed to respond to batch:', error);
      window.showNotification && window.showNotification(
        'Failed to process request. Please try again.', 
        'error'
      );
    } finally {
      setResponding(prev => ({ ...prev, [`batch_${batchId}`]: false }));
    }
  };

  // Toggle batch expansion
  const toggleBatchExpanded = (batchId) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  // Update individual song decision within a batch
  const updateSongDecision = (batchId, requestId, decision) => {
    setBatchDecisions(prev => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || {}),
        [requestId]: decision
      }
    }));
  };

  // Toggle pack permissions for a batch
  const togglePackPermissions = (batchId) => {
    setPackPermissions(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  };

  const handleDeleteRequest = (batchId, requestId = null, isBatch = false) => {
    setDeleteAlert({ isOpen: true, batchId, requestId, isBatch });
  };

  const confirmDeleteRequest = async () => {
    const { batchId, requestId, isBatch } = deleteAlert;
    if (!batchId && !requestId) return;

    try {
      const key = isBatch ? `batch_${batchId}` : requestId;
      setResponding(prev => ({ ...prev, [key]: true }));
      
      let result;
      if (isBatch && batchId) {
        result = await collaborationRequestsService.cancelBatch(batchId);
      } else if (requestId) {
        result = await collaborationRequestsService.cancelRequest(requestId);
      }
      
      if (result?.success) {
        await fetchCollaborationRequests();
        window.showNotification && window.showNotification(
          isBatch ? 'Batch request cancelled successfully.' : 'Collaboration request deleted successfully.', 
          'success'
        );
      } else {
        window.showNotification && window.showNotification(
          result?.error || 'Failed to delete request. Please try again.', 
          'error'
        );
      }
      
    } catch (error) {
      console.error('Failed to delete collaboration request:', error);
      window.showNotification && window.showNotification(
        'Failed to delete request. Please try again.', 
        'error'
      );
    } finally {
      const key = deleteAlert.isBatch ? `batch_${deleteAlert.batchId}` : deleteAlert.requestId;
      setResponding(prev => ({ ...prev, [key]: false }));
      setDeleteAlert({ isOpen: false, batchId: null, requestId: null, isBatch: false });
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', text: 'Pending' },
      approved: { class: 'status-accepted', text: 'Approved' },
      accepted: { class: 'status-accepted', text: 'Accepted' },
      rejected: { class: 'status-rejected', text: 'Rejected' },
      partially_approved: { class: 'status-partial', text: 'Partial' },
      cancelled: { class: 'status-cancelled', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { class: 'status-unknown', text: status };
    
    return (
      <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
    );
  };

  // Render a batch request card (can be single or multi-song)
  const renderBatchCard = (batch, isReceived = true) => {
    const isSingleSong = batch.song_count === 1;
    const isExpanded = expandedBatches.has(batch.batch_id);
    const isProcessing = responding[`batch_${batch.batch_id}`] || responding[batch.songs?.[0]?.request_id];
    const currentDecisions = batchDecisions[batch.batch_id] || {};
    const hasPackPermission = packPermissions[batch.batch_id] || false;
    
    // For unbatched (single) requests, use the single song's request_id
    const singleRequestId = isSingleSong && batch.batch_id === 0 ? batch.songs?.[0]?.request_id : null;
    
    return (
      <div key={`batch_${batch.batch_id}_${batch.songs?.[0]?.request_id}`} className={`request-card ${isSingleSong ? 'single-song' : 'batch-card'}`}>
        <div className="request-header">
          {isSingleSong ? (
            <>
              <div className="song-artwork">
                {batch.songs?.[0]?.song_album_cover ? (
                  <img 
                    src={batch.songs[0].song_album_cover} 
                    alt="Album cover"
                    className="album-cover"
                  />
                ) : (
                  <div className="album-cover-placeholder">
                    <span>♪</span>
                  </div>
                )}
              </div>
              <div className="song-info">
                <h3 className="song-title">{batch.songs?.[0]?.song_title}</h3>
                <p className="song-artist">by {batch.songs?.[0]?.song_artist}</p>
                <span className="song-status-tag">{batch.songs?.[0]?.song_status}</span>
              </div>
            </>
          ) : (
            <div className="batch-info">
              <span className="batch-icon">📦</span>
              <div className="batch-details">
                <h3 className="batch-title">{batch.song_count} songs</h3>
                {batch.packs_involved?.length > 0 && (
                  <p className="batch-packs">
                    From: {batch.packs_involved.map(p => p.pack_name).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="request-meta">
            {getStatusBadge(batch.status)}
            <span className="time">{formatTimeAgo(batch.created_at)}</span>
          </div>
        </div>
        
        <div className="request-content">
          <p className="request-user">
            {isReceived ? 'Request from' : 'Request to'}{' '}
            <span 
              onClick={handleUsernameClick(
                isReceived ? batch.requester_username : batch.target_username
              )}
              className="username-link"
            >
              {isReceived 
                ? (batch.requester_display_name || batch.requester_username)
                : (batch.target_display_name || batch.target_username)
              }
            </span>
          </p>
          
          {batch.message && (
            <div className="request-message">
              <strong>Message:</strong> "{batch.message}"
            </div>
          )}
          
          {batch.response_message && batch.status !== 'pending' && (
            <div className="owner-response">
              <strong>Response:</strong> {batch.response_message}
            </div>
          )}
          
          {batch.grant_full_pack_permissions && batch.status === 'approved' && (
            <div className="pack-permissions-granted">
              <span className="permission-icon">🔓</span>
              <span>Full pack permissions granted</span>
            </div>
          )}
        </div>
        
        {/* Batch songs list (always visible for multi-song, expandable for single) */}
        {!isSingleSong && (
          <div className="batch-songs-preview">
            <button 
              className="expand-btn"
              onClick={() => toggleBatchExpanded(batch.batch_id)}
            >
              {isExpanded ? '▼' : '▶'} View {batch.song_count} songs
            </button>
            
            {isExpanded && (
              <div className="batch-songs-list">
                {batch.songs?.map(song => (
                  <div key={song.request_id} className="batch-song-row">
                    <div className="song-thumb">
                      {song.song_album_cover ? (
                        <img src={song.song_album_cover} alt="" />
                      ) : (
                        <span>♪</span>
                      )}
                    </div>
                    <div className="song-details">
                      <span className="title">{song.song_title}</span>
                      <span className="artist">{song.song_artist}</span>
                    </div>
                    <span className={`status-tag status-${song.song_status?.toLowerCase().replace(' ', '-')}`}>
                      {song.song_status}
                    </span>
                    {batch.status === 'pending' && isReceived && (
                      <select
                        className="decision-select"
                        value={currentDecisions[song.request_id] || 'pending'}
                        onChange={(e) => updateSongDecision(batch.batch_id, song.request_id, e.target.value)}
                      >
                        <option value="pending">Undecided</option>
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                      </select>
                    )}
                    {batch.status !== 'pending' && song.item_status && (
                      <span className={`item-status ${song.item_status}`}>
                        {song.item_status === 'approved' ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Pack permissions option (for received pending requests) */}
        {isReceived && batch.status === 'pending' && batch.packs_involved?.length > 0 && (
          <div className="pack-permissions-option">
            <label className="permission-checkbox">
              <input
                type="checkbox"
                checked={hasPackPermission}
                onChange={() => togglePackPermissions(batch.batch_id)}
              />
              <span className="checkbox-text">
                Grant full pack permissions
                <span className="permission-help">
                  (Access to all songs in {batch.packs_involved.map(p => `"${p.pack_name}"`).join(' and ')})
                </span>
              </span>
            </label>
          </div>
        )}
        
        {/* Actions for received pending requests */}
        {isReceived && batch.status === 'pending' && (
          <div className="request-actions">
            {isSingleSong && singleRequestId ? (
              // Single request - use old API (pass batch.batch_id for pack permissions lookup)
              <>
                <button 
                  onClick={() => handleSingleResponse(singleRequestId, 'accepted', batch.batch_id)}
                  disabled={isProcessing}
                  className="btn btn-accept"
                >
                  {isProcessing ? 'Processing...' : 'Accept'}
                </button>
                <button 
                  onClick={() => handleSingleResponse(singleRequestId, 'rejected', batch.batch_id)}
                  disabled={isProcessing}
                  className="btn btn-reject"
                >
                  {isProcessing ? 'Processing...' : 'Decline'}
                </button>
              </>
            ) : (
              // Batch request - use batch API
              <>
                <button 
                  onClick={() => handleBatchResponse(batch.batch_id, 'approve_all')}
                  disabled={isProcessing}
                  className="btn btn-accept"
                >
                  {isProcessing ? 'Processing...' : 'Approve All'}
                </button>
                <button 
                  onClick={() => handleBatchResponse(batch.batch_id, 'reject_all')}
                  disabled={isProcessing}
                  className="btn btn-reject"
                >
                  {isProcessing ? 'Processing...' : 'Reject All'}
                </button>
                {isExpanded && Object.keys(currentDecisions).length > 0 && (
                  <button 
                    onClick={() => handleBatchResponse(batch.batch_id, 'selective')}
                    disabled={isProcessing}
                    className="btn btn-selective"
                  >
                    {isProcessing ? 'Processing...' : 'Apply Selective'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Actions for sent pending requests */}
        {!isReceived && batch.status === 'pending' && (
          <div className="request-actions">
            {isSingleSong && singleRequestId ? (
              <button 
                onClick={() => handleDeleteRequest(null, singleRequestId, false)}
                disabled={isProcessing}
                className="btn btn-delete"
              >
                {isProcessing ? 'Deleting...' : 'Delete Request'}
              </button>
            ) : (
              <button 
                onClick={() => handleDeleteRequest(batch.batch_id, null, true)}
                disabled={isProcessing}
                className="btn btn-delete"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Batch'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const filterBatchesByStatus = (batches, status) => {
    if (status === 'accepted') {
      return batches.filter(b => b.status === 'approved' || b.status === 'accepted' || b.status === 'partially_approved');
    }
    return batches.filter(b => b.status === status);
  };

  if (loading) {
    return (
      <div className="collaboration-requests-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading collaboration requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="collaboration-requests-page">
        <div className="error-container">
          <h2>Error Loading Requests</h2>
          <p>{error}</p>
          <button onClick={fetchCollaborationRequests} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="collaboration-requests-page">
      <div className="page-header">
        <h1>Collaboration Requests</h1>
        <p>Manage your collaboration requests and partnerships</p>
      </div>
      
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received Requests
            {filterBatchesByStatus(receivedBatches, 'pending').length > 0 && (
              <span className="count-badge">
                {filterBatchesByStatus(receivedBatches, 'pending').length}
              </span>
            )}
          </button>
          <button 
            className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent Requests
          </button>
        </div>
      </div>
      
      <div className="tab-content">
        {activeTab === 'received' && (
          <div className="received-requests">
            <div className="section">
              <h2>Pending Requests</h2>
              {filterBatchesByStatus(receivedBatches, 'pending').length === 0 ? (
                <div className="empty-state">
                  <p>No pending collaboration requests</p>
                  <span className="empty-state-subtext">New collaboration requests will appear here</span>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterBatchesByStatus(receivedBatches, 'pending').map(batch => 
                    renderBatchCard(batch, true)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Accepted Requests</h2>
              {filterBatchesByStatus(receivedBatches, 'accepted').length === 0 ? (
                <div className="empty-state">
                  <p>No accepted collaboration requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterBatchesByStatus(receivedBatches, 'accepted').map(batch => 
                    renderBatchCard(batch, true)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Rejected Requests</h2>
              {filterBatchesByStatus(receivedBatches, 'rejected').length === 0 ? (
                <div className="empty-state">
                  <p>No rejected collaboration requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterBatchesByStatus(receivedBatches, 'rejected').map(batch => 
                    renderBatchCard(batch, true)
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'sent' && (
          <div className="sent-requests">
            <div className="section">
              <h2>Pending Requests</h2>
              {filterBatchesByStatus(sentBatches, 'pending').length === 0 ? (
                <div className="empty-state">
                  <p>No pending sent requests</p>
                  <span className="empty-state-subtext">Send collaboration requests from community songs</span>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterBatchesByStatus(sentBatches, 'pending').map(batch => 
                    renderBatchCard(batch, false)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Accepted Requests</h2>
              {filterBatchesByStatus(sentBatches, 'accepted').length === 0 ? (
                <div className="empty-state">
                  <p>No accepted sent requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterBatchesByStatus(sentBatches, 'accepted').map(batch => 
                    renderBatchCard(batch, false)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Rejected Requests</h2>
              {filterBatchesByStatus(sentBatches, 'rejected').length === 0 ? (
                <div className="empty-state">
                  <p>No rejected sent requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterBatchesByStatus(sentBatches, 'rejected').map(batch => 
                    renderBatchCard(batch, false)
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />

      {/* Custom Alert for deleting collaboration requests */}
      <CustomAlert
        isOpen={deleteAlert.isOpen}
        onClose={() => setDeleteAlert({ isOpen: false, batchId: null, requestId: null, isBatch: false })}
        onConfirm={confirmDeleteRequest}
        title={deleteAlert.isBatch ? "Cancel Batch Request" : "Delete Collaboration Request"}
        message={deleteAlert.isBatch 
          ? "Are you sure you want to cancel this batch request? All songs in this request will be removed."
          : "Are you sure you want to delete this collaboration request? This action cannot be undone."
        }
        confirmText={deleteAlert.isBatch ? "Cancel Batch" : "Delete"}
        cancelText="Keep"
        type="danger"
      />
    </div>
  );
};

export default CollaborationRequestsPage;
