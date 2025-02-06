// src/components/ChatList.jsx
import React from 'react';

export default function ChatList({ users, selectedUser, setSelectedUser }) {
  return (
    <div className="w-[20%] min-w-[220px] border-r border-gray-300 flex flex-col">
      <h2 className="text-xl font-bold p-4 border-b">Chats</h2>
      <ul>
        {users.map((user) => (
          <li
            key={user}
            className={`p-3 cursor-pointer ${
              selectedUser === user ? 'bg-gray-200 font-semibold rounded-lg' : 'hover:bg-gray-100'
            }`}
            onClick={() => setSelectedUser(user)}
          >
            {user}
          </li>
        ))}
      </ul>
    </div>
  );
}
