import React, { useState } from 'react';
import { MdSearch } from 'react-icons/md';

const mockRequests = [
  { name: 'Eve', status: 'pending' },
  { name: 'Frank', status: 'pending' },
  { name: 'Grace', status: 'pending' },
  { name: 'Hank', status: 'pending' },
];

export default function Requests() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequests = mockRequests.filter(request =>
    request.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Placeholder function for accepting a friend request
  const acceptRequest = async (name) => {
    try {
      // Placeholder for database integration
      console.log(`Accepted request from ${name}`);
      // Add your database integration code here
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  // Placeholder function for declining a friend request
  const declineRequest = async (name) => {
    try {
      // Placeholder for database integration
      console.log(`Declined request from ${name}`);
      // Add your database integration code here
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg m-3 p-3 overflow-hidden">
      <div className="p-2">
        <h2 className="text-2xl font-bold text-ucd-blue-900">Friend Requests</h2>
      </div>
      <div className="px-2 pb-2 relative">
        <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2 text-ucd-blue-600" />
        <input
          type="text"
          placeholder="Search requests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-8 p-1 pl-10 bg-ucd-blue-light border border-ucd-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-ucd-gold-600"
        />
      </div>
      <ul className="flex-1 overflow-y-auto">
        {filteredRequests.map((request, index) => (
          <li
            key={index}
            className="flex flex-col items-start p-4 mb-2 bg-white rounded-lg shadow-md"
          >
            <div className="flex items-center w-full mb-2">
              <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4">
                {request.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-ucd-blue-900">{request.name}</h2>
                <p className="text-sm text-gray-500">{request.status}</p>
              </div>
            </div>
            <div className="flex space-x-2 w-full">
              <button
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg"
                onClick={() => acceptRequest(request.name)}
              >
                Accept
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg"
                onClick={() => declineRequest(request.name)}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}