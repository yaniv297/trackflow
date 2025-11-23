import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config";
import { apiPost, apiGet } from "../../utils/api";
import { capitalizeName } from "../../utils/formUtils";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Hook for handling pack form submission logic
 */
export const usePackFormSubmission = (
  mode,
  meta,
  entries,
  creationMode,
  setIsSubmitting,
  setProgress
) => {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const willCreateSeries = meta.isAlbumSeries;
    const effectivePack =
      meta.pack ||
      (willCreateSeries && meta.albumSeriesAlbum
        ? `${capitalizeName(meta.albumSeriesAlbum)} Album Series`
        : "");
    const effectiveArtist =
      mode === "artist"
        ? meta.artist ||
          (willCreateSeries ? capitalizeName(meta.albumSeriesArtist) : "")
        : "";

    if (!effectivePack || (mode === "artist" && !effectiveArtist)) {
      window.showNotification("Pack name and artist are required", "warning");
      return;
    }

    if (
      meta.isAlbumSeries &&
      (!meta.albumSeriesArtist || !meta.albumSeriesAlbum)
    ) {
      window.showNotification(
        "Album series artist and name are required when creating an album series",
        "warning"
      );
      return;
    }

    // Check if there are any songs to create
    const songLines = entries
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (songLines.length === 0) {
      window.showNotification(
        "Please add at least one song to create a pack",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    let payload;
    if (mode === "artist") {
      // Artist mode: one artist, multiple titles
      const titles = entries
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      payload = titles.map((title) => ({
        title,
        artist: capitalizeName(effectiveArtist),
        pack_name: effectivePack,
        status: meta.status,
        priority: meta.priority,
      }));
    } else {
      // Mixed mode: "Artist - Title" format
      payload = entries
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          // Split on " - " (space-hyphen-space) to avoid breaking artist names with hyphens
          const parts = line.split(" - ");
          if (parts.length >= 2) {
            // If we have a proper " - " separator
            const artist = parts[0].trim();
            const title = parts.slice(1).join(" - ").trim(); // Rejoin in case title has " - "
            return {
              title: capitalizeName(title || "Unknown Title"),
              artist: capitalizeName(artist || "Unknown Artist"),
              pack_name: effectivePack,
              status: meta.status,
              priority: meta.priority,
            };
          } else {
            // Fallback: if no " - " found, treat whole line as title with unknown artist
            return {
              title: capitalizeName(line.trim() || "Unknown Title"),
              artist: capitalizeName("Unknown Artist"),
              pack_name: effectivePack,
              status: meta.status,
              priority: meta.priority,
            };
          }
        });
    }

    try {
      // First, create the songs
      const createdSongs = await apiPost("/songs/batch", payload);
      const newIds = createdSongs.map((s) => s.id);

      // If creating an album series, create it now
      if (meta.isAlbumSeries) {
        setProgress({ phase: "Creating album series", current: 1, total: 1 });
        window.showNotification("Creating album series...", "info");

        try {
          const res = await fetch(
            `${API_BASE_URL}/album-series/create-from-pack`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pack_name: effectivePack,
                artist_name: capitalizeName(meta.albumSeriesArtist),
                album_name: capitalizeName(meta.albumSeriesAlbum),
                year: null,
                cover_image_url: null,
                description: null,
              }),
            }
          );

          if (!res.ok) {
            throw new Error("Failed to create album series");
          }

          const createdSeries = await res.json();
          window.showNotification(
            `Album series "${meta.albumSeriesAlbum}" created successfully!`,
            "success"
          );

          // If user opted in or wizard mode, schedule the Edit modal to open on WIP page
          if (
            (meta.openEditorAfterCreate || creationMode === "wizard") &&
            createdSeries &&
            createdSeries.id
          ) {
            try {
              // Find pack_id from created songs
              const packId = createdSongs[0]?.pack_id;
              if (packId) {
                const payload = {
                  packName: effectivePack,
                  packId,
                  series: [
                    {
                      id: createdSeries.id,
                      number: createdSeries.series_number,
                      name: createdSeries.album_name,
                    },
                  ],
                };
                localStorage.setItem(
                  "tf_open_edit_series",
                  JSON.stringify(payload)
                );
              }
            } catch (_e) {}
          }
        } catch (err) {
          console.warn("Failed to create album series:", err);
          window.showNotification(
            "Songs created but failed to create album series. You can create it manually later.",
            "warning"
          );
        }
      }

      // Enhancement phase - check user settings first
      let shouldAutoEnhance = true;
      try {
        const userSettings = await apiGet("/user-settings/me");
        // Explicitly check for true/1, default to true if undefined/null
        shouldAutoEnhance =
          userSettings.auto_spotify_fetch_enabled === true ||
          userSettings.auto_spotify_fetch_enabled === 1 ||
          userSettings.auto_spotify_fetch_enabled === undefined ||
          userSettings.auto_spotify_fetch_enabled === null;
      } catch (err) {
        console.warn(
          "Failed to fetch user settings, defaulting to auto-enhance:",
          err
        );
        // Default to true if we can't fetch settings
      }

      if (shouldAutoEnhance) {
        setProgress({
          phase: "Enhancing from Spotify",
          current: 0,
          total: createdSongs.length,
        });
        window.showNotification("Enhancing songs from Spotify...", "info");

        for (let i = 0; i < createdSongs.length; i++) {
          const song = createdSongs[i];
          setProgress({
            phase: "Enhancing from Spotify",
            current: i + 1,
            total: createdSongs.length,
          });

          try {
            const optionsRes = await fetch(
              `${API_BASE_URL}/spotify/${song.id}/spotify-options/`
            );
            if (!optionsRes.ok) {
              throw new Error(
                `Failed to fetch Spotify options for song ${song.id}: ${optionsRes.status}`
              );
            }
            const options = await optionsRes.json();

            if (options.length > 0) {
              const enhanceRes = await fetch(
                `${API_BASE_URL}/spotify/${song.id}/enhance/`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ track_id: options[0].track_id }),
                }
              );
              if (!enhanceRes.ok) {
                throw new Error(
                  `Failed to enhance song ${song.id}: ${enhanceRes.status}`
                );
              }
            }
          } catch (err) {
            console.warn(`Failed to enhance song ${song.id}`, err);
            // Don't fail the entire process for enhancement errors
          }
        }
      }

      // Cleanup phase
      setProgress({ phase: "Cleaning remaster tags", current: 1, total: 1 });
      window.showNotification("Cleaning remaster tags...", "info");
      try {
        const cleanupRes = await fetch(`${API_BASE_URL}/tools/bulk-clean`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newIds),
        });
        if (!cleanupRes.ok) {
          throw new Error(
            `Failed to clean remaster tags: ${cleanupRes.status}`
          );
        }
      } catch (err) {
        console.warn("Failed to clean remaster tags", err);
        // Don't fail the entire process for cleanup errors
      }

      // Build success message based on what actually happened
      const enhancementText = shouldAutoEnhance ? "enhanced & " : "";
      const successMessage = meta.isAlbumSeries
        ? `${createdSongs.length} song(s) added to album series "${meta.albumSeriesAlbum}", ${enhancementText}cleaned.`
        : `${createdSongs.length} song(s) added to "${effectivePack}", ${enhancementText}cleaned.`;

      window.showNotification(successMessage, "success");

      // Check for new achievements
      await checkAndShowNewAchievements();

      navigate(
        `/${
          meta.status === "In Progress"
            ? "wip"
            : meta.status === "Released"
            ? "released"
            : "future"
        }`
      );
    } catch (err) {
      console.error("Pack creation error:", err);

      // Enhanced error handling with specific messages
      let errorMessage = "Failed to create pack";

      if (err.message) {
        const message = err.message.toLowerCase();

        // Check for specific error cases
        if (message.includes("album series already exists")) {
          errorMessage = `Album series "${meta.albumSeriesAlbum}" by ${meta.albumSeriesArtist} already exists. Please use a different name or artist.`;
        } else if (message.includes("some songs could not be created")) {
          // This is a song duplication error, show the actual backend message
          errorMessage = err.message;
        } else if (
          message.includes("already exists") ||
          message.includes("duplicate")
        ) {
          // Generic duplication error, show the backend message
          errorMessage = err.message;
        } else if (message.includes("not found") || message.includes("404")) {
          errorMessage =
            "One or more songs could not be found. Please check the song titles and try again.";
        } else if (
          message.includes("unauthorized") ||
          message.includes("401")
        ) {
          errorMessage =
            "You are not authorized to create packs. Please log in again.";
        } else if (message.includes("forbidden") || message.includes("403")) {
          errorMessage = "You don't have permission to create this pack.";
        } else if (
          message.includes("validation") ||
          message.includes("invalid")
        ) {
          errorMessage =
            "Invalid data provided. Please check your input and try again.";
        } else if (
          message.includes("spotify") ||
          message.includes("spotify")
        ) {
          errorMessage =
            "Failed to fetch data from Spotify. Please check your internet connection and try again.";
        } else if (
          message.includes("timeout") ||
          message.includes("network")
        ) {
          errorMessage =
            "Request timed out. Please check your internet connection and try again.";
        } else {
          // Use the original error message if no specific case matches
          errorMessage = err.message;
        }
      }

      window.showNotification(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
      setProgress({ phase: "", current: 0, total: 0 });
    }
  };

  return { handleSubmit };
};

