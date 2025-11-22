import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = ({
  notifications,
  loading,
  unreadCount,
  totalCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
  position = { top: 0, right: 0 }
}) => {
  const navigate = useNavigate();

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

  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'achievement_earned') {
      navigate('/achievements');
    } else if (notification.type === 'comment_reply' || notification.type === 'feature_request_update') {
      if (notification.related_feature_request_id) {
        navigate('/feature-requests');
      }
    }

    onClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'achievement_earned':
        return '🏆';
      case 'comment_reply':
        return '💬';
      case 'feature_request_update':
        return '📋';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className="notification-dropdown"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        right: `${position.right}px`,
        width: '380px',
        maxWidth: '90vw',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10001,
        maxHeight: '500px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{ 
              marginLeft: '0.5rem', 
              color: '#007bff',
              fontSize: '0.9rem' 
            }}>
              ({unreadCount} new)
            </span>
          )}
        </h3>
        
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textDecoration: 'underline'
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          Loading notifications...
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🔔</span>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No notifications yet</p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && notifications.length > 0 && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '400px'
          }}
        >
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                backgroundColor: notification.is_read ? 'white' : '#f8f9ff',
                transition: 'background-color 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = notification.is_read ? '#f8f9fa' : '#f0f4ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = notification.is_read ? 'white' : '#f8f9ff';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                  {getNotificationIcon(notification.type)}
                </span>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: notification.is_read ? 'normal' : 'bold',
                    fontSize: '0.9rem',
                    color: '#333',
                    marginBottom: '0.25rem'
                  }}>
                    {notification.title}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.8rem',
                    color: '#666',
                    marginBottom: '0.5rem',
                    lineHeight: '1.3'
                  }}>
                    {notification.message}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.7rem',
                    color: '#999',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{formatTimeAgo(notification.created_at)}</span>
                    
                    {!notification.is_read && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#007bff',
                        borderRadius: '50%',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && totalCount > 0 && (
        <div
          style={{
            padding: '0.75rem',
            borderTop: '1px solid #eee',
            textAlign: 'center',
            background: '#f8f9fa'
          }}
        >
          <button
            onClick={() => {
              navigate('/notifications'); // Go to the full notifications page
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'underline'
            }}
          >
            View all notifications ({totalCount})
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;