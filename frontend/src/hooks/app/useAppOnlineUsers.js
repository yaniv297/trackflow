import { useState, useEffect, useRef } from "react";
import { apiGet } from "../../utils/api";

/**
 * Hook for managing online user count and tooltip (admin only)
 */
export const useAppOnlineUsers = (isAuthenticated, user) => {
  const [onlineUserCount, setOnlineUserCount] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineTooltip, setShowOnlineTooltip] = useState(false);
  const onlineTooltipRef = useRef(null);
  const [onlineTooltipPos, setOnlineTooltipPos] = useState({
    top: 0,
    right: 0,
  });

  // Fetch online user count for admins
  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) {
      setOnlineUserCount(null);
      setOnlineUsers([]);
      return;
    }

    const fetchOnlineCount = async () => {
      try {
        const data = await apiGet("/admin/online-users");
        setOnlineUserCount(data.online_count);
        setOnlineUsers(data.online_users || []);
      } catch (error) {
        // Silently fail - don't show errors for this feature
        console.error("Failed to fetch online user count:", error);
      }
    };

    // Fetch immediately
    fetchOnlineCount();

    // Then poll every 30 seconds
    const interval = setInterval(fetchOnlineCount, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.is_admin]);

  // Calculate tooltip position
  useEffect(() => {
    if (showOnlineTooltip && onlineTooltipRef.current) {
      const rect = onlineTooltipRef.current.getBoundingClientRect();
      setOnlineTooltipPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showOnlineTooltip]);

  return {
    onlineUserCount,
    onlineUsers,
    showOnlineTooltip,
    setShowOnlineTooltip,
    onlineTooltipRef,
    onlineTooltipPos,
  };
};

