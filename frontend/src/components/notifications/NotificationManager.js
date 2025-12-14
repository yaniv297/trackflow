import React, { useState, useCallback } from "react";
import Notification from "./Notification";
import AchievementToast from "./AchievementToast";

const NotificationManager = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [achievementToasts, setAchievementToasts] = useState([]);

  const showNotification = useCallback(
    (message, type = "info", duration = 5000) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const showAchievementToast = useCallback(
    (achievement, currentScore = null) => {
      const id = Date.now() + Math.random();
      setAchievementToasts((prev) => [
        ...prev,
        { id, achievement, currentScore },
      ]);
    },
    []
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const removeAchievementToast = useCallback((id) => {
    setAchievementToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Make functions available globally
  React.useEffect(() => {
    window.showNotification = showNotification;
    window.showAchievementToast = showAchievementToast;
    return () => {
      delete window.showNotification;
      delete window.showAchievementToast;
    };
  }, [showNotification, showAchievementToast]);

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
      {achievementToasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            top: `${20 + index * 200}px`,
            right: "20px",
            zIndex: 100000,
          }}
        >
          <AchievementToast
            achievement={toast.achievement}
            currentScore={toast.currentScore}
            onClose={() => removeAchievementToast(toast.id)}
            duration={6000}
          />
        </div>
      ))}
    </>
  );
};

export default NotificationManager;
