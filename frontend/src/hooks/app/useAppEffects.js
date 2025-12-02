import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";


/**
 * Hook for managing various app-level effects
 */
export const useAppEffects = (isAuthenticated, user) => {
  const location = useLocation();
  const navigate = useNavigate();

  // After route changes, check if we should open the edit album series modal
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tf_open_edit_series");
      if (raw) {
        const detail = JSON.parse(raw);
        if (
          detail &&
          detail.packId &&
          detail.series &&
          detail.series.length > 0
        ) {
          const evt = new CustomEvent("open-edit-album-series", { detail });
          window.dispatchEvent(evt);
        }
        localStorage.removeItem("tf_open_edit_series");
      }
    } catch (_e) {}
  }, [location.pathname]);

  // Global event listeners for album series modals
  useEffect(() => {
    const createHandler = (e) => {
      const { artistName, albumName, status, skipNavigation } = e.detail || {};

      // Check if we should skip navigation (when called from NewPackForm)
      if (skipNavigation) {
        const modalEvent = new CustomEvent("open-create-album-series-modal", {
          detail: { artistName, albumName, status },
        });
        window.dispatchEvent(modalEvent);
        return;
      }

      // Only navigate to WIP page if we're not already there
      if (window.location.pathname !== "/wip") {
        navigate("/wip");
        // Use setTimeout to ensure navigation completes before opening modal
        setTimeout(() => {
          const modalEvent = new CustomEvent("open-create-album-series-modal", {
            detail: { artistName, albumName, status },
          });
          window.dispatchEvent(modalEvent);
        }, 100);
      } else {
        // If already on WIP page, open modal immediately
        const modalEvent = new CustomEvent("open-create-album-series-modal", {
          detail: { artistName, albumName, status },
        });
        window.dispatchEvent(modalEvent);
      }
    };

    window.addEventListener("open-create-album-series", createHandler);

    return () => {
      window.removeEventListener("open-create-album-series", createHandler);
    };
  }, [navigate]);

};

