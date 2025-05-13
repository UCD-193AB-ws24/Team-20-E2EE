import React, { useState } from 'react';
import {searchFriendUid} from '../../api/friends';
export default function GroupCreationPopUp({ friends, onClose, onCreate }) {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState('');

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
  <div className="bg-white rounded-lg p-6 w-full shadow-lg border border-gray-200">
    <h3 className="text-xl font-semibold mb-4">Create New Group</h3>

    <input
      type="text"
      placeholder="Group Name"
      value={groupName}
      onChange={(e) => setGroupName(e.target.value)}
      className="w-full mb-3 p-2 border rounded"
    />

    <div className="max-h-60 overflow-y-auto mb-4">
      {friends.map((friend) => (
        <label key={friend.username} className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            checked={selectedMembers.includes(friend.username)}
            onChange={() => toggleMember(friend.username)}
          />
          <span>{friend.username}</span>
        </label>
      ))}
    </div>

    <div className="flex justify-end space-x-3">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
      >
        Cancel
      </button>
      <button
        onClick={handleCreate}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Create
      </button>
    </div>
  </div>
</div>

  );
}
