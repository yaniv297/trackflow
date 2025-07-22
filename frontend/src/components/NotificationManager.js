import React, { useState, useCallback } from "react";
import Notification from "./Notification";

const NotificationManager = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Make showNotification available globally
  React.useEffect(() => {
    window.showNotification = showNotification;
    return () => {
      delete window.showNotification;
    };
  }, [showNotification]);

  return (
    <>
      {children}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
};

export default NotificationManager;
