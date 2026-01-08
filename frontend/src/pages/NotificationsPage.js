import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiDelete } from '../utils/api';
import { dispatchNotificationDeletedEvent } from '../utils/notificationEvents';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Notifications per page
  const [deletingAll, setDeletingAll] = useState(false);

  // Fetch notifications with pagination
  const fetchNotifications = async (page = currentPage) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const data = await apiGet(`/notifications/?limit=${pageSize}&offset=${offset}`);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await apiPut(`/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiPut('/notifications/mark-all-read');
      
      // Update local state
      setNotifications(notifications.map(n => ({ 
        ...n, 
        is_read: true, 
        read_at: new Date().toISOString() 
      })));
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await apiDelete(`/notifications/${notificationId}`);
      
      const notification = notifications.find(n => n.id === notificationId);
      
      // Update local state
      const remainingNotifications = notifications.filter(n => n.id !== notificationId);
      setNotifications(remainingNotifications);
      setTotalCount(prev => Math.max(0, prev - 1));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // If current page becomes empty and we're not on page 1, go to previous page
      if (remainingNotifications.length === 0 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (remainingNotifications.length === 0) {
        // If we're on page 1 and it's empty, refetch to get updated total count
        fetchNotifications(1);
      }
      
      // Dispatch event to update header count
      dispatchNotificationDeletedEvent(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
      return;
    }

    setDeletingAll(true);
    try {
      // Get all notification IDs (we need to fetch all to delete them)
      // Since we're paginated, we'll delete the current page's notifications
      // and then fetch the next page until all are deleted
      let allNotifications = [...notifications];
      let offset = 0;
      const limit = 100; // Fetch in batches
      
      // First, fetch all notifications in batches to get their IDs
      while (true) {
        const data = await apiGet(`/notifications/?limit=${limit}&offset=${offset}`);
        const batch = data.notifications;
        
        if (batch.length === 0) break;
        
        // Delete each notification in the batch
        for (const notification of batch) {
          try {
            await apiDelete(`/notifications/${notification.id}`);
            // Dispatch event for each deleted notification
            dispatchNotificationDeletedEvent(notification.id);
          } catch (error) {
            console.error(`Failed to delete notification ${notification.id}:`, error);
          }
        }
        
        if (batch.length < limit) break; // Last batch
        offset += limit;
      }
      
      // Reset state
      setNotifications([]);
      setTotalCount(0);
      setUnreadCount(0);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      alert('Failed to delete all notifications. Please try again.');
    } finally {
      setDeletingAll(false);
      // Refresh to show updated state
      fetchNotifications(1);
    }
  };


  // Handle notification click (navigate to relevant page)
  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'achievement_earned') {
      navigate('/achievements');
    } else if (notification.type === 'comment_reply' || notification.type === 'feature_request_update') {
      if (notification.related_feature_request_id) {
        navigate('/feature-requests');
      }
    } else if (notification.type === 'welcome') {
      navigate('/help'); // Or wherever help/FAQ is located
    } else if (notification.type === 'pack_release') {
      navigate('/releases');
    } else if (
      notification.type === 'collaboration_request' ||
      notification.type === 'collaboration_response' ||
      notification.type === 'collab_batch_request' ||
      notification.type === 'collab_batch_response'
    ) {
      navigate('/collaboration-requests');
    } else if (
      notification.type === 'collab_song_progress' ||
      notification.type === 'collab_song_status' ||
      notification.type === 'collab_wip_assignments'
    ) {
      if (notification.related_song_id) {
        navigate(`/wip?song=${notification.related_song_id}`);
      } else {
        navigate('/wip');
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) {
      return 'Unknown time';
    }

    // Parse the date string - handle both UTC (with Z) and naive UTC (without timezone)
    // Backend sends UTC timestamps, so we need to ensure they're parsed as UTC
    let date;
    try {
      // FastAPI/Pydantic may send dates without timezone info (naive UTC)
      // JavaScript's Date constructor interprets strings without timezone as LOCAL time
      // So we need to explicitly treat them as UTC
      if (typeof dateString === 'string') {
        // If it already has timezone info (Z, +, or - after position 10), use as-is
        if (dateString.endsWith('Z') || dateString.match(/[+-]\d{2}:\d{2}$/)) {
          date = new Date(dateString);
        } else {
          // No timezone info - assume it's UTC and append 'Z'
          // Handle formats like "2024-01-15T10:30:00" or "2024-01-15 10:30:00"
          const normalized = dateString.replace(' ', 'T').replace(/\.\d+$/, '');
          date = new Date(normalized + (normalized.includes('T') ? 'Z' : ''));
        }
      } else {
        date = new Date(dateString);
      }
    } catch (e) {
      console.warn('Error parsing date:', dateString, e);
      // Fallback to regular parsing
      date = new Date(dateString);
    }
    
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }
    
    const diffMs = now.getTime() - date.getTime();
    
    // Handle future dates (shouldn't happen, but just in case)
    if (diffMs < 0) {
      return date.toLocaleDateString();
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'achievement_earned':
        return '🏆';
      case 'comment_reply':
        return '💬';
      case 'feature_request_update':
        return '📋';
      case 'welcome':
        return '🎉';
      case 'pack_release':
        return '🎵';
      case 'collab_song_progress':
        return '🎚️';
      case 'collab_song_status':
        return '🎼';
      case 'collab_wip_assignments':
        return '🤝';
      case 'collaboration_request':
      case 'collaboration_response':
      case 'collab_batch_request':
      case 'collab_batch_response':
        return '🤝';
      default:
        return '🔔';
    }
  };

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div style={{ 
      padding: '1rem 2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      minHeight: '80vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #eee'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>
            Notifications
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
            {totalCount} total notifications
            {unreadCount > 0 && (
              <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                {' '}• {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <button
              onClick={deleteAllNotifications}
              disabled={deletingAll}
              style={{
                background: deletingAll ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: deletingAll ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: deletingAll ? 0.6 : 1
              }}
            >
              {deletingAll ? 'Deleting...' : 'Delete all'}
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: '#666' 
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
          Loading notifications...
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          color: '#666' 
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>🔔</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#999' }}>
            No notifications yet
          </h2>
          <p style={{ fontSize: '1rem', color: '#999' }}>
            When you earn achievements or get updates, they'll appear here.
          </p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && notifications.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  backgroundColor: notification.is_read ? 'white' : '#f8f9ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  e.target.style.borderColor = '#ddd';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = 'none';
                  e.target.style.borderColor = '#eee';
                }}
              >
                <div 
                  onClick={() => handleNotificationClick(notification)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
                >
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: notification.is_read ? 'normal' : 'bold',
                      fontSize: '1rem',
                      color: '#333',
                      marginBottom: '0.25rem'
                    }}>
                      {notification.title}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.9rem',
                      color: '#666',
                      marginBottom: '0.75rem',
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: '#999',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{formatTimeAgo(notification.created_at)}</span>
                      
                      {!notification.is_read && (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                  title="Delete notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid #eee'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!hasPrevPage || loading}
                style={{
                  background: hasPrevPage ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: hasPrevPage && !loading ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                  opacity: hasPrevPage ? 1 : 0.6
                }}
              >
                Previous
              </button>
              
              <span style={{ color: '#666', fontSize: '0.9rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={!hasNextPage || loading}
                style={{
                  background: hasNextPage ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: hasNextPage && !loading ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem',
                  opacity: hasNextPage ? 1 : 0.6
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;