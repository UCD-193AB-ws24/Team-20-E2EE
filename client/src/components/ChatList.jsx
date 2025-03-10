import React, { useState, useEffect } from 'react';
import { MdSearch } from 'react-icons/md';
import { getFriendList } from '../api/friends';
import { registerUserOnlineListener, registerUserOfflineListener, removeListener } from '../api/socket';

export default function ChatList({ selectedUser, setSelectedUser, messagesByUser, isTyping }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

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
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriends();
  }, []);

  // Set up online status listeners
  useEffect(() => {
    registerUserOnlineListener((data) => {
      const { username } = data;
      setOnlineUsers(prev => ({
        ...prev,
        [username]: true
      }));
    });
    
    registerUserOfflineListener((data) => {
      const { username } = data;
      setOnlineUsers(prev => ({
        ...prev,
        [username]: false
      }));
    });
    
    return () => {
      removeListener('user_online');
      removeListener('user_offline');
    };
  }, []);

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get last message for each friend
  const getLastMessage = (username) => {
    if (!messagesByUser[username] || messagesByUser[username].length === 0) {
      return "No messages yet";
    }
    const messages = messagesByUser[username];
    const lastMessage = messages[messages.length - 1];
    return lastMessage.text;
  };

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
      
      {isLoading ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ucd-blue-600"></div>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {filteredFriends.length === 0 ? (
            <p className="p-4 text-gray-500">No chats found</p>
          ) : (
            filteredFriends.map((friend, index) => (
              <li
                key={index}
                className={`my-1 p-2 cursor-pointer flex items-center space-x-3 rounded-lg ${
                  selectedUser === friend.username ? 'bg-ucd-blue-light text-ucd-blue-900' : 'hover:bg-ucd-blue-light'
                }`}
                onClick={() => setSelectedUser(friend.username)}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedUser === friend.username ? 'bg-ucd-blue-200 text-ucd-blue-900' : 'bg-ucd-blue-600 text-white'
                  }`}>
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  {/* Online indicator */}
                  {onlineUsers[friend.username] && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between">
                    <span className="font-semibold truncate">{friend.username}</span>
                  </div>
                  <span className={`text-sm ${
                    selectedUser === friend.username ? 'text-ucd-blue-700' : 'text-ucd-blue-700'
                  }`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isTyping[friend.username] ? (
                      <span className="italic">typing...</span>
                    ) : (
                      getLastMessage(friend.username)
                    )}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}