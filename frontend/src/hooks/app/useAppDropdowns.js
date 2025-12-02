import { useState, useEffect, useRef } from "react";

/**
 * Hook for managing all dropdown states and positions in App
 */
export const useAppDropdowns = () => {
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAnalyticsDropdown, setShowAnalyticsDropdown] = useState(false);
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  
  const newDropdownRef = useRef(null);
  const analyticsDropdownRef = useRef(null);
  const communityDropdownRef = useRef(null);
  const helpDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);
  
  const [newDropdownPos, setNewDropdownPos] = useState({ top: 0, left: 0 });
  const [analyticsDropdownPos, setAnalyticsDropdownPos] = useState({
    top: 0,
    left: 0,
  });
  const [communityDropdownPos, setCommunityDropdownPos] = useState({
    top: 0,
    left: 0,
  });
  const [helpDropdownPos, setHelpDropdownPos] = useState({
    top: 0,
    left: 0,
  });
  const [userDropdownPos, setUserDropdownPos] = useState({ top: 0, right: 0 });
  const [adminDropdownPos, setAdminDropdownPos] = useState({ top: 0, left: 0 });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNewDropdown && !event.target.closest(".dropdown-container")) {
        setShowNewDropdown(false);
      }
      if (
        showAnalyticsDropdown &&
        !event.target.closest(".dropdown-container")
      ) {
        setShowAnalyticsDropdown(false);
      }
      if (
        showCommunityDropdown &&
        !event.target.closest(".dropdown-container")
      ) {
        setShowCommunityDropdown(false);
      }
      if (
        showHelpDropdown &&
        !event.target.closest(".dropdown-container")
      ) {
        setShowHelpDropdown(false);
      }
      if (showAdminDropdown && !event.target.closest(".dropdown-container")) {
        setShowAdminDropdown(false);
      }
      if (
        showUserDropdown &&
        !event.target.closest(".user-dropdown-container")
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    showNewDropdown,
    showAnalyticsDropdown,
    showCommunityDropdown,
    showHelpDropdown,
    showAdminDropdown,
    showUserDropdown,
  ]);

  // Calculate dropdown positions when they open
  useEffect(() => {
    if (showNewDropdown && newDropdownRef.current) {
      const rect = newDropdownRef.current.getBoundingClientRect();
      setNewDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showNewDropdown]);

  useEffect(() => {
    if (showAnalyticsDropdown && analyticsDropdownRef.current) {
      const rect = analyticsDropdownRef.current.getBoundingClientRect();
      setAnalyticsDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showAnalyticsDropdown]);

  useEffect(() => {
    if (showCommunityDropdown && communityDropdownRef.current) {
      const rect = communityDropdownRef.current.getBoundingClientRect();
      setCommunityDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showCommunityDropdown]);

  useEffect(() => {
    if (showHelpDropdown && helpDropdownRef.current) {
      const rect = helpDropdownRef.current.getBoundingClientRect();
      setHelpDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showHelpDropdown]);

  useEffect(() => {
    if (showAdminDropdown && adminDropdownRef.current) {
      const rect = adminDropdownRef.current.getBoundingClientRect();
      setAdminDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showAdminDropdown]);

  useEffect(() => {
    if (showUserDropdown && userDropdownRef.current) {
      const rect = userDropdownRef.current.getBoundingClientRect();
      setUserDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showUserDropdown]);

  return {
    showNewDropdown,
    setShowNewDropdown,
    showUserDropdown,
    setShowUserDropdown,
    showAnalyticsDropdown,
    setShowAnalyticsDropdown,
    showCommunityDropdown,
    setShowCommunityDropdown,
    showHelpDropdown,
    setShowHelpDropdown,
    showAdminDropdown,
    setShowAdminDropdown,
    newDropdownRef,
    analyticsDropdownRef,
    communityDropdownRef,
    helpDropdownRef,
    userDropdownRef,
    adminDropdownRef,
    newDropdownPos,
    analyticsDropdownPos,
    communityDropdownPos,
    helpDropdownPos,
    userDropdownPos,
    adminDropdownPos,
  };
};

