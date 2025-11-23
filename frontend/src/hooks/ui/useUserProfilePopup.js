import { useState, useCallback, useEffect } from "react";

export const useUserProfilePopup = () => {
  const [popupState, setPopupState] = useState({
    isVisible: false,
    username: null,
    position: { x: 0, y: 0 },
  });

  const showPopup = useCallback((username, event) => {
    // Prevent default to avoid any unwanted behavior
    event.preventDefault();
    event.stopPropagation();

    // Calculate position relative to the clicked element
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2; // Center horizontally on the element
    const y = rect.bottom + 8; // 8px below the element

    // Adjust position to keep popup within viewport
    const popupWidth = 250; // Approximate popup width
    const popupHeight = 150; // Approximate popup height
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

  const handleUsernameClick = useCallback(
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
    handleUsernameClick,
  };
};
