// Utility functions for handling notification events

export const dispatchNewNotificationEvent = () => {
  // Dispatch a custom event to notify components about new notifications
  const event = new CustomEvent('new-notification', {
    detail: { timestamp: Date.now() }
  });
  window.dispatchEvent(event);
};

export const dispatchAchievementEarnedEvent = (achievement) => {
  // Dispatch achievement earned event for toast notifications
  const event = new CustomEvent('achievement-earned', {
    detail: { achievement, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
  
  // Also trigger the general new notification event
  dispatchNewNotificationEvent();
};

export const dispatchNotificationReadEvent = (notificationId) => {
  // Dispatch event when a notification is marked as read
  const event = new CustomEvent('notification-read', {
    detail: { notificationId, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
};

export const dispatchAllNotificationsReadEvent = () => {
  // Dispatch event when all notifications are marked as read
  const event = new CustomEvent('all-notifications-read', {
    detail: { timestamp: Date.now() }
  });
  window.dispatchEvent(event);
};