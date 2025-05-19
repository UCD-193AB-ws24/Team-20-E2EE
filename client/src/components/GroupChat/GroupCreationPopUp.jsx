import React, { useState } from 'react';
import {searchFriendUid} from '../../api/friends';
import { useAppContext } from '../AppContext';

export default function GroupCreationPopUp({ friends, onClose, onCreate }) {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const { theme } = useAppContext();

  const toggleMember = (username) => {
    setSelectedMembers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      alert('Please enter a group name and select at least one member.');
      return;
    }
  
    console.log("Selected members:", selectedMembers);
  
    try {
      const memberIds = await Promise.all(
        selectedMembers.map(async (member) => {
          const {uid} = await searchFriendUid(member);
          return uid;
        })
      );
  
      console.log("Resolved member UIDs:", memberIds);
  
      onCreate({ name: groupName.trim(), members: memberIds });
      onClose();
    } catch (err) {
      console.error("Error resolving member UIDs:", err);
      alert("Failed to fetch user IDs. Please try again.");
    }
  };
  
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-3/5 max-w-xl">
      <div 
        className="rounded-lg p-6 w-full shadow-lg border"
        style={{ 
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.background.accent,
          color: theme.colors.text.primary
        }}
      >
        <h3 className="text-xl font-semibold mb-4">Create New Group</h3>

        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
          style={{ 
            backgroundColor: theme.colors.background.primary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.background.accent
          }}
        />

        <div 
          className="max-h-60 overflow-y-auto mb-4 p-2 border rounded"
          style={{ 
            backgroundColor: theme.colors.background.primary,
            borderColor: theme.colors.background.accent
          }}
        >
          {friends.map((friend) => (
            <label key={friend.username} className="flex items-center space-x-2 mb-2 p-1 hover:rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMembers.includes(friend.username)}
                onChange={() => toggleMember(friend.username)}
                className="accent-blue-600"
              />
              <span>{friend.username}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded hover:opacity-90 transition"
            style={{ 
              backgroundColor: theme.colors.background.accent,
              color: theme.colors.text.primary
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded hover:opacity-90 transition"
            style={{ 
              backgroundColor: theme.colors.button.secondary,
              color: theme.colors.text.secondary
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
