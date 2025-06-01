import React, { useEffect, useState } from "react";
import { searchUsername } from "../../api/friends";
import { LoadingAnimation } from "../index";
import { 
  addMemberToGroup, 
  removeMemberFromGroup, 
  updateGroupName,
  transferGroupAdmin,
  deleteGroup 
} from "../../api/messages";
import getCurrentUser from "../../util/getCurrentUser";
import { useAppContext } from "../index";

export default function GroupInfoPopUp({ group, onClose, setSelectedUser }) {
  const [memberUsernames, setMemberUsernames] = useState([]);
  const [isAddMemberSelected, setIsAddMemberSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const [adminUsername, setAdminUsername] = useState("");
  const [showTransferAdmin, setShowTransferAdmin] = useState(false);
  const [transferUsername, setTransferUsername] = useState("");
  const currentUser = getCurrentUser();
  const { theme } = useAppContext();

  // Check if current user is admin
  const isCurrentUserAdmin = group.admin === currentUser.uid;

  useEffect(() => {
    if (!group?._id) return;

    const fetchUsernames = async () => {
      try {
        setLoading(true);
        const usernames = await Promise.all(
          group.members.map(async (uid) => {
            const result = await searchUsername(uid);
            return { uid, username: result.username };
          })
        );
        
        setMemberUsernames(usernames.map(u => u.username));
        
        // Find and set admin username
        const admin = usernames.find(u => u.uid === group.admin);
        setAdminUsername(admin ? admin.username : "Unknown");
      } catch (err) {
        console.error("Error fetching usernames:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsernames();
  }, [group?._id, group.admin]);

  if (!group) return null;

  const handleInvite = async () => {
    if (!isCurrentUserAdmin) {
      alert("Only the group admin can add members");
      return;
    }

    const response = await addMemberToGroup(group._id, addMemberUsername);
    if (response && response.success) {
      setMemberUsernames((prev) => [...prev, addMemberUsername]);
      setAddMemberUsername("");
    } else {
      console.error("Failed to add member");
      alert("Failed to add member. They may already be in the group or not found.");
    }
  };

  const handleRemoveMember = async (username) => {
    if (!isCurrentUserAdmin && username !== currentUser.username) {
      alert("Only the group admin can remove other members");
      return;
    }

    if (username === adminUsername && username !== currentUser.username) {
      alert("Cannot remove the group admin");
      return;
    }

    const confirmMessage = username === currentUser.username 
      ? "Are you sure you want to leave this group?"
      : `Are you sure you want to remove ${username} from the group?`;
    
    if (!window.confirm(confirmMessage)) return;

    const response = await removeMemberFromGroup(group._id, username);
    if (response && response.success) {
      setMemberUsernames((prev) => prev.filter((user) => user !== username));
      
      if (username === currentUser.username) {
        setSelectedUser(null);
        onClose();
      }
    } else {
      console.error("Failed to remove member");
      alert("Failed to remove member");
    }
  };

  const handleTransferAdmin = async () => {
    if (!transferUsername.trim()) {
      alert("Please enter a username");
      return;
    }

    if (!memberUsernames.includes(transferUsername)) {
      alert("User must be a member of the group");
      return;
    }

    if (transferUsername === currentUser.username) {
      alert("You are already the admin");
      return;
    }

    const confirmTransfer = window.confirm(
      `Are you sure you want to transfer admin privileges to ${transferUsername}? You will no longer be the admin.`
    );
    
    if (!confirmTransfer) return;

    try {
      const response = await transferGroupAdmin(group._id, transferUsername);
      if (response && response.success) {
        setAdminUsername(transferUsername);
        setShowTransferAdmin(false);
        setTransferUsername("");
        alert("Admin privileges transferred successfully");
      } else {
        alert("Failed to transfer admin privileges");
      }
    } catch (error) {
      console.error("Error transferring admin:", error);
      alert("Failed to transfer admin privileges");
    }
  };

  const handleDeleteGroup = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the group "${group.name}"? This action cannot be undone and all group messages will be deleted.`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await deleteGroup(group._id);
      if (response && response.success) {
        setSelectedUser(null);
        onClose();
        alert("Group deleted successfully");
      } else {
        alert("Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const handleUpdateGroupName = async () => {
    if (!isCurrentUserAdmin) {
      alert("Only the group admin can change the group name");
      setEditedName(group.name);
      return;
    }

    if (editedName.trim() === group.name) return;

    const response = await updateGroupName(group._id, editedName.trim());
    if (response && response.success) {
      console.log("Group name updated successfully");
    } else {
      console.error("Failed to update group name");
      alert("Failed to update group name");
      setEditedName(group.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div 
        className="rounded-lg p-6 max-w-md w-full shadow-lg max-h-[80vh] overflow-y-auto"
        style={{
          background: theme.colors.background.secondary,
          color: theme.colors.text.primary
        }}
      >
        {!isAddMemberSelected && !showTransferAdmin ? (
          <div className="flex flex-row justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Group Info</h3>
            {isCurrentUserAdmin && (
              <button
                className="cursor-pointer px-4 py-2 rounded-lg hover:brightness-105"
                style={{background: theme.colors.button.primary}}
                onClick={() => setIsAddMemberSelected(true)}
              >
                Add Members
              </button>
            )}
          </div>
        ) : isAddMemberSelected ? (
          <div className="flex flex-row justify-between items-center mb-4 gap-6">
            <div className="flex items-center border border-gray-400 rounded-lg overflow-hidden w-full max-w-md">
              <input
                type="text"
                className="flex-1 px-4 py-2 outline-none"
                placeholder="Enter username..."
                value={addMemberUsername}
                onChange={(e) => setAddMemberUsername(e.target.value)}
              />
              <button
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 border-l border-gray-400"
                onClick={handleInvite}
              >
                Invite
              </button>
            </div>
            <button
              className="hover:bg-gray-300 cursor-pointer border border-gray-400 bg-gray-200 px-4 py-2 rounded-lg"
              onClick={() => setIsAddMemberSelected(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-4">Transfer Admin</h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                className="flex-1 px-4 py-2 border rounded"
                placeholder="Enter username..."
                value={transferUsername}
                onChange={(e) => setTransferUsername(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleTransferAdmin}
              >
                Transfer
              </button>
            </div>
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => setShowTransferAdmin(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {!isAddMemberSelected && !showTransferAdmin && (
          <>
            <div className="mb-4">
              <strong>Name:</strong>{" "}
              {isEditingName && isCurrentUserAdmin ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={() => {
                    setIsEditingName(false);
                    handleUpdateGroupName();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsEditingName(false);
                      handleUpdateGroupName();
                    }
                  }}
                  className="border px-2 py-1 rounded w-full max-w-xs"
                  autoFocus
                />
              ) : (
                <span
                  className={isCurrentUserAdmin ? "cursor-pointer hover:underline" : ""}
                  onClick={() => isCurrentUserAdmin && setIsEditingName(true)}
                  title={isCurrentUserAdmin ? "Click to edit (Admin only)" : "Only admin can edit"}
                >
                  {group.name}
                </span>
              )}
            </div>

            <div className="mb-2">
              <strong>Admin:</strong> {adminUsername} 
              {adminUsername === currentUser.username && " (You)"}
            </div>

            <div className="mb-2">
              <strong>Members ({memberUsernames.length}):</strong>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <LoadingAnimation size="medium" color="ucd-blue" />
              </div>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto mb-4">
                {memberUsernames.map((username, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center group hover:bg-gray-100 px-2 py-1 rounded transition"
                  >
                    <span>
                      {username}
                      {username === adminUsername && " 👑"}
                      {username === currentUser.username && " (You)"}
                    </span>

                    {(isCurrentUserAdmin && username !== currentUser.username) || 
                     (username === currentUser.username && !isCurrentUserAdmin) ? (
                      <button
                        className="text-red-500 hover:text-red-700 hidden group-hover:block"
                        onClick={() => handleRemoveMember(username)}
                        title={
                          username === currentUser.username 
                            ? "Leave group" 
                            : "Remove member (Admin only)"
                        }
                      >
                        {username === currentUser.username ? "Leave" : "×"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 hidden group-hover:block">
                        {username === adminUsername ? "Admin" : "Admin only"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2">
              {isCurrentUserAdmin && (
                <>
                  <button
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    onClick={() => setShowTransferAdmin(true)}
                  >
                    Transfer Admin
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={handleDeleteGroup}
                  >
                    Delete Group
                  </button>
                </>
              )}
              
              {!isCurrentUserAdmin && (
                <button
                  className="px-4 py-2 text-white bg-red-700 rounded hover:bg-red-800"
                  onClick={() => handleRemoveMember(currentUser.username)}
                >
                  Leave Group
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
