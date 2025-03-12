import React, { useState, useEffect } from 'react';
import { MdSearch, MdPersonRemove } from 'react-icons/md';
import { getFriendList, searchUsers, sendFriendRequest, unfriendUser } from '../api/friends';

export default function Friends({ selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [unfriendConfirm, setUnfriendConfirm] = useState(null);

  // Get the auth token from localStorage
  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.idToken;
  };

  // Fetch friends list on component mount
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const token = getToken();
        const data = await getFriendList(token);
        setFriends(data.friends || []);
      } catch (err) {
        setError(err.message || 'Failed to load friends');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriends();
  }, []);

  // Handle search
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim().length > 0) {
      setSearchMode(true);
      try {
        const results = await searchUsers(value);
        setSearchResults(results.users || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchMode(false);
      setSearchResults([]);
    }
  };

  // Send friend request
  const handleSendRequest = async (username) => {
    try {
      const token = getToken();
      await sendFriendRequest(token, username);
      alert(`Friend request sent to ${username}`);
    } catch (err) {
      alert(err.message || 'Failed to send friend request');
    }
  };
  
  // Unfriend user
  const handleUnfriend = async (username) => {
    try {
      const token = getToken();
      await unfriendUser(token, username);
      // Remove friend from list without refetching
      setFriends(friends.filter(friend => friend.username !== username));
      setUnfriendConfirm(null);
    } catch (err) {
      alert(err.message || 'Failed to unfriend user');
    }
  };

  // Filter friends based on search if not in search mode
  const filteredFriends = searchMode ? [] : 
    friends.filter(friend => 
      friend.username.toLowerCase().includes(searchTerm.toLowerCase())
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
          placeholder="Search friends or users..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full h-8 p-1 pl-10 bg-ucd-blue-light border border-ucd-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-ucd-gold-600"
        />
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
      ) : searchMode ? (
        <div className="flex-1 overflow-y-auto">
          <h3 className="px-4 py-2 text-sm font-semibold text-gray-500">Search Results</h3>
          {searchResults.length === 0 ? (
            <p className="p-4 text-gray-500">No users found</p>
          ) : (
            <ul>
              {searchResults.map((user, index) => (
                <li 
                  key={index}
                  className="flex items-center justify-between p-4 mb-2 bg-white rounded-lg shadow-md"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.username}</span>
                  </div>
                  <button
                    onClick={() => handleSendRequest(user.username)}
                    className="px-4 py-2 bg-ucd-blue-600 text-white rounded-lg hover:bg-ucd-blue-700"
                  >
                    Add Friend
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {filteredFriends.length === 0 ? (
            <p className="p-4 text-gray-500">No friends found</p>
          ) : (
            filteredFriends.map((friend, index) => (
              <li
                key={index}
                className={`flex items-center justify-between p-4 mb-2 bg-white rounded-lg shadow-md ${
                  selectedUser === friend.username ? 'bg-ucd-blue-light' : ''
                }`}
              >
                <div 
                  className="flex items-center flex-1 cursor-pointer" 
                  onClick={() => setSelectedUser(friend.username)}
                >
                  <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{friend.username}</h3>
                  </div>
                </div>
                
                {/* Unfriend button */}
                {unfriendConfirm === friend.username ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUnfriend(friend.username)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setUnfriendConfirm(null)}
                      className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setUnfriendConfirm(friend.username)}
                    className="ml-2 p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                    title="Unfriend"
                  >
                    <MdPersonRemove size={20} />
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}