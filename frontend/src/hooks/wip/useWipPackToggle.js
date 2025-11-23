import { useCallback } from "react";

/**
 * Custom hook for managing pack toggle functionality in WipPage
 */
export const useWipPackToggle = (
  collapsedPacks,
  setCollapsedPacks,
  grouped,
  viewMode
) => {
  const togglePack = useCallback(
    (packName) => {
      setCollapsedPacks((prev) => ({
        ...prev,
        [packName]: !prev[packName],
      }));
    },
    [setCollapsedPacks]
  );

  const toggleCategory = useCallback(
    (categoryName) => {
      setCollapsedPacks((prev) => ({
        ...prev,
        [categoryName]: !prev[categoryName],
      }));
    },
    [setCollapsedPacks]
  );

  const toggleAll = useCallback(() => {
    if (viewMode === "pack") {
      const allCollapsed = grouped.every(({ pack }) => collapsedPacks[pack]);
      const newState = {};
      grouped.forEach(({ pack }) => {
        newState[pack] = !allCollapsed;
      });
      setCollapsedPacks(newState);
    } else {
      // Completion view
      const categories = [
        "completed",
        "inProgress",
        "optional",
        "collaboratorSongs",
        "optionalCollaboratorSongs",
      ];
      const allCollapsed = categories.every((cat) => collapsedPacks[cat]);
      const newState = { ...collapsedPacks };
      categories.forEach((cat) => {
        newState[cat] = !allCollapsed;
      });
      setCollapsedPacks(newState);
    }
  }, [viewMode, grouped, collapsedPacks, setCollapsedPacks]);

  return {
    togglePack,
    toggleCategory,
    toggleAll,
  };
};

