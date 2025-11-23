import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiDelete } from './utils/api';
import { dispatchNotificationDeletedEvent } from './utils/notificationEvents';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch all notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/notifications/?limit=100'); // Get more notifications on the full page
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
      setNotifications(notifications.filter(n => n.id !== notificationId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Dispatch event to update header count
      dispatchNotificationDeletedEvent(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
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
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
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
      default:
        return '🔔';
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
      )}
    </div>
  );
};

export default NotificationsPage;