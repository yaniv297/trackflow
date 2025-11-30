import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export const useUserProfilePopup = () => {
  const navigate = useNavigate();
  const hideTimeout = useRef(null);
  const [popupState, setPopupState] = useState({
    isVisible: false,
    username: null,
    position: { x: 0, y: 0 },
  });

  const showPopup = useCallback((username, event) => {
    // Clear any pending hide timeout
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }

    // Calculate position relative to the clicked element
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2; // Center horizontally on the element
    const y = rect.bottom + 8; // 8px below the element

    // Adjust position to keep popup within viewport
    const popupWidth = 320; // Updated popup width
    const popupHeight = 300; // Updated popup height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position if popup would go off-screen
    if (x + popupWidth / 2 > viewportWidth) {
      adjustedX = viewportWidth - popupWidth / 2 - 10;
    } else if (x - popupWidth / 2 < 0) {
      adjustedX = popupWidth / 2 + 10;
    }

    // Adjust vertical position if popup would go off-screen
    if (y + popupHeight > viewportHeight) {
      adjustedY = rect.top - popupHeight - 8; // Show above the element instead
    }

    setPopupState({
      isVisible: true,
      username,
      position: { x: adjustedX, y: adjustedY },
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopupState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const delayedHidePopup = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      hidePopup();
    }, 300); // 300ms delay before hiding
  }, [hidePopup]);

  const cancelHideTimeout = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  }, []);

  const handleUsernameClick = useCallback(
    (username) => (event) => {
      // Check if it's a right-click or ctrl+click - show popup for these
      if (event.button === 2 || event.ctrlKey || event.metaKey) {
        showPopup(username, event);
        return;
      }
      
      // For regular clicks, navigate directly to profile
      event.preventDefault();
      event.stopPropagation();
      navigate(`/profile/${username}`);
    },
    [navigate, showPopup]
  );

  const handleUsernameHover = useCallback(
    (username) => (event) => {
      showPopup(username, event);
    },
    [showPopup]
  );

  // Add global click handler to close popup when clicking outside
  useEffect(() => {
    const handleGlobalClick = (event) => {
      // Check if the click is outside the popup
      const popupElement = document.querySelector(
        '[data-popup="user-profile"]'
      );
      if (popupElement && !popupElement.contains(event.target)) {
        hidePopup();
      }
    };

    if (popupState.isVisible) {
      // Add a small delay to prevent immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleGlobalClick);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleGlobalClick);
      };
    }
  }, [popupState.isVisible, hidePopup]);

  return {
    popupState,
    showPopup,
    hidePopup,
    delayedHidePopup,
    cancelHideTimeout,
    handleUsernameClick,
    handleUsernameHover,
  };
};
