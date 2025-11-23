import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Custom hook for auto-expanding packs from URL parameters
 * Handles navigation from dashboard to specific packs/songs
 */
export const useWipAutoExpand = ({
  loading,
  songs,
  collapsedPacks,
  setCollapsedPacks,
  viewMode,
  setViewMode,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const packToExpandRef = useRef(null);

  useEffect(() => {
    // Wait for loading to complete and songs to be available
    if (loading || songs.length === 0) return;

    const packIdParam = searchParams.get("pack");
    const songIdParam = searchParams.get("song");

    if (!packIdParam && !songIdParam) {
      packToExpandRef.current = null;
      return;
    }

    // Find the pack to expand
    let targetPackName = null;

    if (packIdParam) {
      // Find pack by pack_id
      const packId = parseInt(packIdParam);
      const targetSong = songs.find((s) => s.pack_id === packId);
      if (targetSong) {
        targetPackName = targetSong.pack_name || "(no pack)";
      }
    } else if (songIdParam) {
      // Find pack containing this song
      const songId = parseInt(songIdParam);
      const targetSong = songs.find((s) => s.id === songId);
      if (targetSong) {
        targetPackName = targetSong.pack_name || "(no pack)";
      }
    }

    if (targetPackName) {
      // Always expand if URL param is present, even if we've done it before
      // This ensures it stays expanded even if useWipData resets the state
      const shouldExpand =
        packToExpandRef.current !== targetPackName ||
        collapsedPacks[targetPackName] !== false;

      if (shouldExpand) {
        packToExpandRef.current = targetPackName;

        // Expand the pack - use functional update to ensure we override any default collapsed state
        setCollapsedPacks((prev) => ({
          ...prev,
          [targetPackName]: false,
        }));

        // Ensure we're in pack view mode
        if (viewMode !== "pack") {
          setViewMode("pack");
        }

        // Scroll to the pack immediately - try multiple times to ensure element is rendered
        const scrollToPack = () => {
          const packElement = document.querySelector(
            `[data-pack-name="${targetPackName}"]`
          );
          if (packElement) {
            // Scroll immediately to top of screen
            const elementTop =
              packElement.getBoundingClientRect().top + window.pageYOffset;
            const offset = 80; // Header offset
            window.scrollTo({
              top: elementTop - offset,
              behavior: "smooth",
            });
            return true;
          }
          return false;
        };

        // Try immediately, then with a small delay if needed
        if (!scrollToPack()) {
          requestAnimationFrame(() => {
            if (!scrollToPack()) {
              setTimeout(scrollToPack, 100);
            }
          });
        }

        // Clean up URL params after expanding (only once)
        if (packToExpandRef.current === targetPackName) {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("pack");
          newParams.delete("song");
          if (newParams.toString() !== searchParams.toString()) {
            setSearchParams(newParams, { replace: true });
          }
        }
      }
    }
  }, [
    loading,
    songs,
    collapsedPacks,
    searchParams,
    setSearchParams,
    viewMode,
    setViewMode,
    setCollapsedPacks,
  ]);
};

