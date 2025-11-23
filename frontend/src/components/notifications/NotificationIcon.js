import React, { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiDelete } from '../../utils/api';
import NotificationDropdown from './NotificationDropdown';

const NotificationIcon = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      console.log('🔔 Fetching notification count...');
      const data = await apiGet('/notifications/count');
      console.log('📊 Notification count response:', data);
      setUnreadCount(data.unread_count);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('❌ Failed to fetch notification count:', error);
    }
  };

  // Fetch full notifications list when dropdown opens
  const fetchNotifications = async () => {
    if (loading || hasLoadedOnce) return;
    
    console.log('📋 Fetching notifications...');
    setLoading(true);
    try {
      const data = await apiGet('/notifications/?limit=4');
      console.log('📋 Fetched notifications response:', data);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setTotalCount(data.total_count);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
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
      
      // Update count
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
      
      // No popup message - silent operation
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      if (window.showNotification) {
        window.showNotification('Failed to mark notifications as read', 'error');
      }
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    console.log(`🗑️ Deleting notification ${notificationId}...`);
    try {
      await apiDelete(`/notifications/${notificationId}`);
      console.log(`✅ Successfully deleted notification ${notificationId}`);
      
      const notification = notifications.find(n => n.id === notificationId);
      
      // Update local state
      setNotifications(notifications.filter(n => n.id !== notificationId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ 
        top: rect.bottom + 8, 
        right: window.innerWidth - rect.right 
      });
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Fetch notification count on mount and set up polling
  useEffect(() => {
    fetchNotificationCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time notification events
  useEffect(() => {
    const handleNewNotification = () => {
      // Refresh count and notifications if dropdown is open
      fetchNotificationCount();
      if (showDropdown) {
        setHasLoadedOnce(false);
        fetchNotifications();
      }
    };

    const handleAchievementEarned = () => {
      // When an achievement is earned, refresh notifications
      console.log('Achievement earned - refreshing notifications');
      fetchNotificationCount();
      if (showDropdown) {
        setHasLoadedOnce(false);
        fetchNotifications();
      }
    };

    const handleNotificationDeleted = (event) => {
      const { notificationId } = event.detail;
      console.log(`🗑️ NotificationIcon: Received deletion event for notification ${notificationId}`);
      
      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    const handleAllNotificationsDeleted = () => {
      console.log('🗑️ NotificationIcon: All notifications deleted');
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
    };

    window.addEventListener('new-notification', handleNewNotification);
    window.addEventListener('achievement-earned', handleAchievementEarned);
    window.addEventListener('achievements-updated', handleAchievementEarned);
    window.addEventListener('notification-deleted', handleNotificationDeleted);
    window.addEventListener('all-notifications-deleted', handleAllNotificationsDeleted);
    
    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
      window.removeEventListener('achievement-earned', handleAchievementEarned);
      window.removeEventListener('achievements-updated', handleAchievementEarned);
      window.removeEventListener('notification-deleted', handleNotificationDeleted);
      window.removeEventListener('all-notifications-deleted', handleAllNotificationsDeleted);
    };
  }, [showDropdown, notifications]);

  return (
    <div className="notification-icon-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="notification-icon-button"
        style={{
          background: showDropdown ? 'rgba(255,255,255,0.2)' : 'transparent',
          border: showDropdown ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          position: 'relative',
          padding: '0.4rem 0.8rem',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          if (!showDropdown) {
            e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!showDropdown) {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = 'transparent';
          }
        }}
      >
        <span style={{ fontSize: '1.1rem', color: 'white' }}>🔔</span>
        {unreadCount > 0 && (
          <span
            className="notification-badge"
            style={{
              position: 'absolute',
              top: '0.2rem',
              right: '0.2rem',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              minWidth: '1.2rem',
              height: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 0.2rem'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          totalCount={totalCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
          onClose={() => setShowDropdown(false)}
          position={dropdownPos}
        />
      )}
    </div>
  );
};

export default NotificationIcon;