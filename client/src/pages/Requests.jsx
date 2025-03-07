import React, { useState, useEffect } from 'react';
import { getFriendRequests, acceptFriendRequest, deleteFriendRequest } from '../api/friends';

export default function Requests() {
  const [friendRequests, setFriendRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get the auth token from localStorage
  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.idToken;
  };

  // Fetch friend requests on component mount
  useEffect(() => {
    const loadFriendRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = getToken();
        const data = await getFriendRequests(token);
        console.log(data);

        setFriendRequests(data.friendRequests || []);
      } catch (err) {
        setError(err.message || 'Failed to load friend requests');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriendRequests();
  }, []);

  // Handle accepting a friend request
  const handleAcceptRequest = async (username) => {
    try {
      const token = getToken();
      await acceptFriendRequest(token, username);
      // Remove from list after accepting
      setFriendRequests(friendRequests.filter(request => request.username !== username));
      alert(`Friend request from ${username} accepted`);
    } catch (err) {
      alert(err.message || 'Failed to accept friend request');
    }
  };

  // Handle declining a friend request
  const handleDeclineRequest = async (username) => {
    try {
      const token = getToken();
      await deleteFriendRequest(token, username);
      // Remove from list after declining
      setFriendRequests(friendRequests.filter(request => request.username !== username));
      alert(`Friend request from ${username} declined`);
    } catch (err) {
      alert(err.message || 'Failed to decline friend request');
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg m-3 p-3 overflow-hidden">
      <div className="p-2">
        <h2 className="text-2xl font-bold text-ucd-blue-900">Friend Requests</h2>
      </div>
      
      {error && (
        <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ucd-blue-600"></div>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {friendRequests.length === 0 ? (
            <p className="p-4 text-gray-500">No friend requests</p>
          ) : (
            friendRequests.map((request, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-4 mb-2 bg-white rounded-lg shadow-md"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4">
                    {request.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{request.username}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request.username)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request.username)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}