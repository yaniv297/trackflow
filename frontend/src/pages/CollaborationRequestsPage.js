import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import collaborationRequestsService from '../services/collaborationRequestsService';
import { useUserProfilePopup } from '../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../components/shared/UserProfilePopup';
import CustomAlert from '../components/ui/CustomAlert';
import './CollaborationRequestsPage.css';

const CollaborationRequestsPage = () => {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('received');
  const [responding, setResponding] = useState({});
  const [deleteAlert, setDeleteAlert] = useState({
    isOpen: false,
    requestId: null,
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
        collaborationRequestsService.getReceivedRequests(),
        collaborationRequestsService.getSentRequests()
      ]);
      
      if (receivedResult.success && sentResult.success) {
        setReceivedRequests(receivedResult.data || []);
        setSentRequests(sentResult.data || []);
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

  const handleResponse = async (requestId, action, message = '') => {
    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      const result = await collaborationRequestsService.respondToRequest(requestId, {
        response: action,
        message: message || (action === 'accepted' ? 'Request accepted' : 'Request declined')
      });
      
      if (result.success) {
        // Refresh the lists
        await fetchCollaborationRequests();
        
        window.showNotification && window.showNotification(
          `Collaboration request ${action} successfully!`, 
          'success'
        );
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

  const handleDeleteRequest = (requestId) => {
    setDeleteAlert({ isOpen: true, requestId });
  };

  const confirmDeleteRequest = async () => {
    const { requestId } = deleteAlert;
    if (!requestId) return;

    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      const result = await collaborationRequestsService.cancelRequest(requestId);
      
      if (result.success) {
        // Refresh the lists
        await fetchCollaborationRequests();
        
        window.showNotification && window.showNotification(
          'Collaboration request deleted successfully.', 
          'success'
        );
      } else {
        window.showNotification && window.showNotification(
          result.error || 'Failed to delete request. Please try again.', 
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
      setResponding(prev => ({ ...prev, [requestId]: false }));
      setDeleteAlert({ isOpen: false, requestId: null });
    }
  };

  const handleReopenRequest = async (requestId, isReceived = false) => {
    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      if (isReceived) {
        // For received requests, reopen by changing status back to pending
        const result = await collaborationRequestsService.reopenRequest(requestId);
        
        if (result.success) {
          // Refresh the lists
          await fetchCollaborationRequests();
          
          window.showNotification && window.showNotification(
            'Collaboration request has been reopened and is now pending.', 
            'success'
          );
        } else {
          window.showNotification && window.showNotification(
            result.error || 'Failed to reopen request. Please try again.', 
            'error'
          );
        }
      } else {
        // For sent requests, delete the request to allow a new one
        const result = await collaborationRequestsService.cancelRequest(requestId);
        
        if (result.success) {
          // Refresh the lists
          await fetchCollaborationRequests();
          
          window.showNotification && window.showNotification(
            'Request removed. You can now send a new collaboration request for this song.', 
            'success'
          );
        } else {
          window.showNotification && window.showNotification(
            result.error || 'Failed to remove request. Please try again.', 
            'error'
          );
        }
      }
      
    } catch (error) {
      console.error('Failed to reopen collaboration request:', error);
      window.showNotification && window.showNotification(
        'Failed to process request. Please try again.', 
        'error'
      );
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }));
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
      accepted: { class: 'status-accepted', text: 'Accepted' },
      rejected: { class: 'status-rejected', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || { class: 'status-unknown', text: status };
    
    return (
      <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const renderRequestCard = (request, isReceived = true) => (
    <div key={request.id} className="request-card">
      <div className="request-header">
        <div className="song-artwork">
          {request.song_album_cover ? (
            <img 
              src={request.song_album_cover} 
              alt={`${request.song_title} album cover`}
              className="album-cover"
            />
          ) : (
            <div className="album-cover-placeholder">
              <span>♪</span>
            </div>
          )}
        </div>
        <div className="song-info">
          <h3 className="song-title">{request.song_title}</h3>
          <p className="song-artist">by {request.song_artist}</p>
          <span className="song-status">{request.song_status}</span>
        </div>
        <div className="request-meta">
          {getStatusBadge(request.status)}
          <span className="time">{formatTimeAgo(request.created_at)}</span>
        </div>
      </div>
      
      <div className="request-content">
        <p className="request-user">
          {isReceived ? 'Request from' : 'Request to'}{' '}
          <span 
            onClick={handleUsernameClick(
              isReceived ? request.requester_username : request.owner_username
            )}
            style={{ 
              cursor: 'pointer', 
              color: '#667eea',
              fontWeight: 'bold'
            }}
          >
            {isReceived 
              ? (request.requester_display_name || request.requester_username)
              : (request.owner_display_name || request.owner_username)
            }
          </span>
        </p>
        
        {request.message && (
          <div className="request-message">
            <strong>Message:</strong> "{request.message}"
          </div>
        )}
        
        {request.requested_parts && request.requested_parts.length > 0 && (
          <div className="requested-parts">
            <strong>Requested parts:</strong> {request.requested_parts.join(', ')}
          </div>
        )}
        
        {request.owner_response && request.status !== 'accepted' && (
          <div className="owner-response">
            <strong>Response:</strong> {request.owner_response}
          </div>
        )}
        
        {request.assigned_parts && request.assigned_parts.length > 0 && (
          <div className="assigned-parts">
            <strong>Assigned parts:</strong> {request.assigned_parts.join(', ')}
          </div>
        )}
        
        {request.status === 'accepted' && (
          <div className="current-song-status">
            <strong>Current song status:</strong> 
            <span className={`song-status-badge status-${request.song_status.toLowerCase().replace(/\s+/g, '-')}`}>
              {request.song_status}
            </span>
          </div>
        )}
      </div>
      
      {isReceived && request.status === 'pending' && (
        <div className="request-actions">
          <button 
            onClick={() => handleResponse(request.id, 'accepted')}
            disabled={responding[request.id]}
            className="btn btn-accept"
          >
            {responding[request.id] ? 'Processing...' : 'Accept'}
          </button>
          <button 
            onClick={() => handleResponse(request.id, 'rejected')}
            disabled={responding[request.id]}
            className="btn btn-reject"
          >
            {responding[request.id] ? 'Processing...' : 'Decline'}
          </button>
        </div>
      )}
      
      {!isReceived && request.status === 'pending' && (
        <div className="request-actions">
          <button 
            onClick={() => handleDeleteRequest(request.id)}
            disabled={responding[request.id]}
            className="btn btn-delete"
          >
            {responding[request.id] ? 'Deleting...' : 'Delete Request'}
          </button>
        </div>
      )}
      
      {!isReceived && request.status === 'rejected' && (
        <div className="request-actions">
          <button 
            onClick={() => handleReopenRequest(request.id, false)}
            disabled={responding[request.id]}
            className="btn btn-reopen"
          >
            {responding[request.id] ? 'Processing...' : 'Remove & Allow New Request'}
          </button>
        </div>
      )}
      
      {isReceived && request.status === 'rejected' && (
        <div className="request-actions">
          <button 
            onClick={() => handleReopenRequest(request.id, true)}
            disabled={responding[request.id]}
            className="btn btn-reopen"
          >
            {responding[request.id] ? 'Processing...' : 'Reopen Request'}
          </button>
        </div>
      )}
    </div>
  );

  const filterRequestsByStatus = (requests, status) => {
    return requests.filter(request => request.status === status);
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
            {filterRequestsByStatus(receivedRequests, 'pending').length > 0 && (
              <span className="count-badge">
                {filterRequestsByStatus(receivedRequests, 'pending').length}
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
              {filterRequestsByStatus(receivedRequests, 'pending').length === 0 ? (
                <div className="empty-state">
                  <p>No pending collaboration requests</p>
                  <span className="empty-state-subtext">New collaboration requests will appear here</span>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterRequestsByStatus(receivedRequests, 'pending').map(request => 
                    renderRequestCard(request, true)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Accepted Requests</h2>
              {filterRequestsByStatus(receivedRequests, 'accepted').length === 0 ? (
                <div className="empty-state">
                  <p>No accepted collaboration requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterRequestsByStatus(receivedRequests, 'accepted').map(request => 
                    renderRequestCard(request, true)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Rejected Requests</h2>
              {filterRequestsByStatus(receivedRequests, 'rejected').length === 0 ? (
                <div className="empty-state">
                  <p>No rejected collaboration requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterRequestsByStatus(receivedRequests, 'rejected').map(request => 
                    renderRequestCard(request, true)
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
              {filterRequestsByStatus(sentRequests, 'pending').length === 0 ? (
                <div className="empty-state">
                  <p>No pending sent requests</p>
                  <span className="empty-state-subtext">Send collaboration requests from community songs</span>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterRequestsByStatus(sentRequests, 'pending').map(request => 
                    renderRequestCard(request, false)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Accepted Requests</h2>
              {filterRequestsByStatus(sentRequests, 'accepted').length === 0 ? (
                <div className="empty-state">
                  <p>No accepted sent requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterRequestsByStatus(sentRequests, 'accepted').map(request => 
                    renderRequestCard(request, false)
                  )}
                </div>
              )}
            </div>
            
            <div className="section">
              <h2>Rejected Requests</h2>
              {filterRequestsByStatus(sentRequests, 'rejected').length === 0 ? (
                <div className="empty-state">
                  <p>No rejected sent requests</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filterRequestsByStatus(sentRequests, 'rejected').map(request => 
                    renderRequestCard(request, false)
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
        onClose={() => setDeleteAlert({ isOpen: false, requestId: null })}
        onConfirm={confirmDeleteRequest}
        title="Delete Collaboration Request"
        message="Are you sure you want to delete this collaboration request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default CollaborationRequestsPage;