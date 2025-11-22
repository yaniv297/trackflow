import React from "react";
import UserDropdown from "../../navigation/UserDropdown";

const UserSelector = ({
  collaborationType,
  selectedUser,
  selectedUsersForShare,
  onUserSelect,
  onShareUsersChange,
  currentUser,
  users,
  pendingCollaborations,
  setPendingCollaborations
}) => {
  const handleUserChange = (e) => {
    const newUsers = e.target.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (collaborationType === "pack_share") {
      // For pack sharing, update the selectedUsersForShare and add to pending immediately
      const oldUsernames = selectedUsersForShare
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      onShareUsersChange(e.target.value);

      // Add any new users to pending collaborations
      const newUsernames = newUsers.filter(
        (username) => !oldUsernames.includes(username)
      );

      newUsernames.forEach((username) => {
        const user = users.find((u) => u.username === username);
        if (user) {
          setPendingCollaborations((prev) => [
            ...prev,
            {
              type: "pack_share",
              user_id: user.id,
              username: user.username,
              permissions: ["pack_view"],
            },
          ]);
        }
      });

      // Remove any deselected users from pending collaborations
      const removedUsernames = oldUsernames.filter(
        (username) => !newUsers.includes(username)
      );

      if (removedUsernames.length > 0) {
        setPendingCollaborations((prev) =>
          prev.filter(
            (collab) =>
              !(
                collab.type === "pack_share" &&
                removedUsernames.includes(collab.username)
              )
          )
        );
      }
    } else if (newUsers.length > 0) {
      onUserSelect(newUsers[newUsers.length - 1]);
    }
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1rem",
          color: "#555",
        }}
      >
        Select a user to add as a collaborator
      </h3>

      <UserDropdown
        value={
          collaborationType === "pack_share"
            ? selectedUsersForShare
            : selectedUser
        }
        onChange={handleUserChange}
        placeholder="Select a user..."
        currentUser={currentUser}
      />
    </div>
  );
};

export default UserSelector;