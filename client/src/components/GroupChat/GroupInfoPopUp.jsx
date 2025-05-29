import React, { useEffect, useState } from "react";
import { searchUsername } from "../../api/friends";
import { LoadingAnimation } from "../index"; // adjust this import if needed
import { addMemberToGroup, removeMemberFromGroup, updateGroupName } from "../../api/messages";
import getCurrentUser from "../../util/getCurrentUser";
import { useAppContext } from "../index";

export default function GroupInfoPopUp({ group, onClose, setSelectedUser }) {
  const [memberUsernames, setMemberUsernames] = useState([]);
  const [isAddMemberSelected, setIsAddMemberSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const currentUser = getCurrentUser();
  const { theme } = useAppContext();

  useEffect(() => {
    if (!group?._id) return;

    const fetchUsernames = async () => {
      try {
        setLoading(true);
        const usernames = await Promise.all(
          group.members.map(async (uid) => {
            const result = await searchUsername(uid);
            return result.username;
          })
        );
        setMemberUsernames(usernames);
      } catch (err) {
        console.error("Error fetching usernames:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsernames();
  }, [group?._id]);

  if (!group) return null;

  const handleInvite = async () => {
    const response = await addMemberToGroup(group._id, addMemberUsername);
    if (response) {
      setMemberUsernames((prev) => [...prev, addMemberUsername]);
    } else {
      console.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (username) => {
    const response = await removeMemberFromGroup(group._id, username);
    if (response) {
      setMemberUsernames((prev) => prev.filter((user) => user !== username));
    } else {
      console.error("Failed to remove member");
    }
  };

  const handleLeaveGroupChat = async () => {
    // pop up an alert to confirm leaving the group
    const confirmLeave = window.confirm(
      "Are you sure you want to leave this group?"
    );
    if (!confirmLeave) return;

    const response = await removeMemberFromGroup(
      group._id,
      currentUser.username
    );
    if (response) {
      setMemberUsernames((prev) =>
        prev.filter((user) => user !== currentUser.username)
      );
      setSelectedUser(null);
      onClose();
    } else {
      console.error("Failed to leave group chat");
    }
  };

  const handleUpdateGroupName = async() =>{
    const response = await updateGroupName(group._id, editedName);
    if (response) {
      setMemberUsernames((prev) =>
        prev.filter((user) => user !== currentUser.username)
      );
      onClose();
    } else {
      console.error("Failed to leave group chat");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-30">
      <div className="rounded-lg p-6 max-w-md w-full shadow-lg"
      style={{background: theme.colors.background.secondary,
              color:theme.colors.text.primary}}>
        {!isAddMemberSelected ? (
          <div className="flex flex-row justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Group Info</h3>
            <button
              className="cursor-pointer px-4 py-2 rounded-lg hover:brightness-105"
              style={{background: theme.colors.button.primary}}
              onClick={() => setIsAddMemberSelected((prev) => !prev)}
            >
              Add Members
            </button>
          </div>
        ) : (
          <div className="flex flex-row justify-between items-center mb-4 gap-6">
            <div className="flex items-center border border-gray-400 rounded-lg overflow-hidden w-full max-w-md">
              <input
                type="text"
                className="flex-1 px-4 py-2 outline-none"
                placeholder="Type here..."
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
              className=" hover:bg-gray-300 cursor-pointer border border-gray-400 bg-gray-200 px-4 py-2 rounded-lg"
              onClick={() => setIsAddMemberSelected((prev) => !prev)}
            >
              Done
            </button>
          </div>
        )}

        <div className="mb-2">
          <strong>Name:</strong>{" "}
          {isEditingName ? (
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
              className="cursor-pointer hover:underline"
              onClick={() => setIsEditingName(true)}
            >
              {group.name}
            </span>
          )}
        </div>
        <p className="mb-2">
          <strong>Members:</strong>
        </p>

        {loading ? (
          <div className="flex justify-center py-4">
            <LoadingAnimation size="medium" color="ucd-blue" />
          </div>
        ) : (
          <ul className="space-y-1">
            {memberUsernames.map((username, i) => (
              <li
                key={i}
                className="flex justify-between items-center group hover:bg-gray-100 px-2 py-1 rounded transition"
              >
                <span>{username}</span>

                {username !== currentUser.username && (
                  <button
                    className="text-red-500 hover:text-red-700 hidden group-hover:block"
                    onClick={() => handleRemoveMember(username)}
                    title="Remove member"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex justify-between">
          <button
            className="px-4 py-2 text-white bg-red-700 rounded hover:bg-red-800"
            onClick={handleLeaveGroupChat}
          >
            Leave Group
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
