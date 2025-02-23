import React, { useState } from 'react';
import { MdSearch } from 'react-icons/md';

const mockMessages = {
  Alice: {
    messages: [
      { sender: 'Alice', text: 'Hey! How are you?', time: '10:00 AM' },
      { sender: 'Me', text: 'I am good! How about you?', time: '10:02 AM' },
    ],
    mostRecentMessage: 'I am good! How about you?',
  },
  Bob: {
    messages: [
      { sender: 'Bob', text: 'Want to grab lunch?', time: '12:30 PM' },
      { sender: 'Me', text: 'Sure, what time?', time: '12:35 PM' },
    ],
    mostRecentMessage: 'Sure, what time?',
  },
  Charlie: {
    messages: [
      { sender: 'Charlie', text: 'Let’s catch up soon!', time: '5:45 PM' },
      { sender: 'Me', text: 'Absolutely! Let me know when.', time: '5:47 PM' },
    ],
    mostRecentMessage: 'Absolutely! Let me know when.',
  },
};

export default function ChatList({ selectedUser, setSelectedUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = Object.keys(mockMessages).filter(user =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentMessages = Object.fromEntries(
    Object.entries(mockMessages).map(([user, { mostRecentMessage }]) => [user, mostRecentMessage])
  );

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg m-3 p-3 overflow-hidden">
      <div className="p-2">
        <h2 className="text-2xl font-bold text-ucd-blue-900">Chats</h2>
      </div>
      <div className="px-2 pb-2 relative">
        <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2 text-ucd-blue-600" />
        <input
          type="text"
          placeholder="Search for a user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-8 p-1 pl-10 bg-ucd-blue-light border border-ucd-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-ucd-gold-600"
        />
      </div>
      <ul className="flex-1 overflow-y-auto">
        {filteredUsers.map((user) => (
          <li
            key={user}
            className={`my-1 p-2 cursor-pointer flex items-center space-x-3 rounded-lg ${
              selectedUser === user ? 'bg-ucd-blue-light text-ucd-blue-900' : 'hover:bg-ucd-blue-light'
            }`}
            onClick={() => setSelectedUser(user)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedUser === user ? 'bg-ucd-blue-200 text-ucd-blue-900' : 'bg-ucd-blue-600 text-white'}`}>
              {user.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-lg font-semibold truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user}</span>
              <span className={`text-sm ${selectedUser === user ? 'text-ucd-blue-700' : 'text-ucd-blue-700'}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {recentMessages[user] || 'No recent messages'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}