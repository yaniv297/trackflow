import { useState, useEffect } from "react";

/**
 * Hook for managing impersonation state
 */
export const useAppImpersonation = (user, isAuthenticated) => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUsername, setImpersonatedUsername] = useState("");

  // Check if we're impersonating
  useEffect(() => {
    const checkImpersonation = () => {
      const impersonating = localStorage.getItem("impersonating");
      if (impersonating) {
        setIsImpersonating(true);
        setImpersonatedUsername(impersonating);
      } else {
        setIsImpersonating(false);
        setImpersonatedUsername("");
      }
    };

    checkImpersonation();

    // Check again after a short delay to ensure localStorage is updated
    const timeout = setTimeout(checkImpersonation, 100);

    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "impersonating" || e.key === null) {
        checkImpersonation();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, isAuthenticated]);

  return { isImpersonating, impersonatedUsername };
};

