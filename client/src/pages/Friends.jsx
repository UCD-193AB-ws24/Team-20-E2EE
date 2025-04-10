import React, { useState, useEffect } from 'react';
import { MdSearch, MdPersonRemove } from 'react-icons/md';
import { getFriendList, unfriendUser } from '../api/friends';
import { getAvatar } from '../api/user';

export default function Friends({ selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unfriendConfirm, setUnfriendConfirm] = useState(null);

  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const data = await getFriendList();
        
        const friendList = await Promise.all(data.friends.map(async (friend) => {
          try {
            const avatarUrl = await getAvatar(friend.username);
            return {
              ...friend,
              avatar: avatarUrl
            };
          } catch (err) {
            console.error(`Error loading avatar for ${friend.username}:`, err);
            return { ...friend, avatar: null };
          }
        }));
        
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };
  
  const handleUnfriend = async (username) => {
    try {
      await unfriendUser(username);
      setFriends(friends.filter(friend => friend.username !== username));
      setUnfriendConfirm(null);
    } catch (err) {
      alert(err.message || 'Failed to unfriend user');
    }
  };

  const filteredFriends = searchTerm.trim() === '' 
    ? friends 
    : friends.filter(friend => friend.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg p-3 overflow-hidden">
      <div className="p-2">
        <h2 className="text-2xl font-bold text-ucd-blue-900">Friends</h2>
      </div>
      
      <div className="px-2 pb-2 relative">
        <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2 text-ucd-blue-600" />
        <input
          type="text"
          placeholder="Search friends..."
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
                  <div className="w-12 h-12 rounded-full bg-ucd-blue-600 text-white flex items-center justify-center mr-4 overflow-hidden">
                    <img 
                      src={friend.avatar || 'https://via.placeholder.com/40'} 
                      alt={friend.username.charAt(0).toUpperCase()}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{friend.username}</h3>
                  </div>
                </div>
                
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