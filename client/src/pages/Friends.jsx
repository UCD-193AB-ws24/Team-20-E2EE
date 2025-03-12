import React, { useState, useEffect } from 'react';
import { MdSearch } from 'react-icons/md';
import { getFriendList, searchUsers, sendFriendRequest } from '../api/friends';
import { BACKEND_URL } from '../config/config';

export default function Friends({ selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [avatar, setAvatar] = useState(null);

  // Get the auth token from localStorage
  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.idToken;
  };

  // Fetch friends list on component mount
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = getToken();
        const data = await getFriendList(token);
        console.log(data);
        const friendList = data.friends.map((friend) => {
          return {
              ...friend,
              avatar: `${BACKEND_URL}/api/user/get-avatar/${friend.username}`
          };
      });
        setFriends(friendList || []);
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
        const userList = results.users.map((user) => {
          return {
            ...user,
            avatar: `${BACKEND_URL}/api/user/get-avatar/${user.username}`
          }
        });
        setSearchResults(userList || []);
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
                  <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4 overflow-hidden">
                    <img 
                      src={user.avatar} 
                      alt={user.username.charAt(0).toUpperCase()} 
                    />
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
                className={`flex items-center p-4 mb-2 bg-white rounded-lg shadow-md cursor-pointer ${
                  selectedUser === friend.username ? 'bg-ucd-blue-light' : ''
                }`}
                onClick={() => setSelectedUser(friend.username)}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4 overflow-hidden">
                    <img 
                      src={friend.avatar} 
                      alt={friend.username.charAt(0).toUpperCase()} 
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{friend.username}</h3>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}