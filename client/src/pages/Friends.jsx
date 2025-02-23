import React, { useState } from 'react';
import { MdSearch } from 'react-icons/md';

const mockFriends = [
  { name: 'Alice', status: 'online' },
  { name: 'Bob', status: 'offline' },
  { name: 'Charlie', status: 'online' },
  { name: 'David', status: 'offline' },
];

export default function Friends({ selectedUser, setSelectedUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg m-3 p-3 overflow-hidden">
      <div className="p-2">
        <h2 className="text-2xl font-bold text-ucd-blue-900">Friends</h2>
      </div>
      <div className="px-2 pb-2 relative">
        <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2 text-ucd-blue-600" />
        <input
          type="text"
          placeholder="Search friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-8 p-1 pl-10 bg-ucd-blue-light border border-ucd-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-ucd-gold-600"
        />
      </div>
      <ul className="flex-1 overflow-y-auto">
        {filteredFriends.map((friend, index) => (
          <li
            key={index}
            className={`flex items-center p-4 mb-2 bg-white rounded-lg shadow-md cursor-pointer ${
              selectedUser === friend.name ? 'bg-ucd-blue-light' : ''
            }`}
            onClick={() => setSelectedUser(friend.name)}
          >
            <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4">
              {friend.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-ucd-blue-900">{friend.name}</h2>
              <p className={`text-sm ${friend.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
                {friend.status}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}