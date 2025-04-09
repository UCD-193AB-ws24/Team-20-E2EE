import React, { useState, useEffect } from 'react';
import { MdSearch } from 'react-icons/md';
import { getFriendList } from '../api/friends';
import { getAllMessagePreviews } from '../api/messages';
import { 
  registerUserOnlineListener, 
  registerUserOfflineListener, 
  registerInitialStatusListener,
  requestInitialStatus,
  removeListener,
} from '../api/socket';
import { getAvatar } from '../api/user';
import { LoadingAnimation, useSocket } from './index';

export default function ChatList({ selectedUser, setSelectedUser, messagesByUser, setMessagesByUser, isTyping }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [messagePreviews, setMessagePreviews] = useState({});
  const { socketReady } = useSocket();

  // Get auth token
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
        
        // Load avatars for each friend
        const friendsWithAvatars = await Promise.all((data.friends || []).map(async (friend) => {
          try {
            const avatar = await getAvatar(friend.username);
            return { ...friend, avatar };
          } catch (err) {
            console.error(`Error loading avatar for ${friend.username}:`, err);
            return friend;
          }
        }));
        
        setFriends(friendsWithAvatars);
        
        // Now load message previews for each friend
        if (data.friends && data.friends.length > 0) {
          await loadMessagePreviews(token, data.friends);
        }
      } catch (err) {
        console.error("Error loading friends:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriends();
  }, []);

  // Set up online status listeners - only when socket is ready
  useEffect(() => {
    if (!socketReady) {
      console.log('Socket not ready, waiting to set up listeners');
      return;
    }
    
    registerUserOnlineListener((data) => {   
      const username = data.username;
      
      if (!username) {
        console.error('Missing username in user_online event:', data);
        return;
      }
      
      setOnlineUsers(prev => {
        return {
          ...prev,
          [username]: true
        };
      });
    });
    
    registerUserOfflineListener((data) => {      
      if (!data) {
        console.error('Received empty data in user_offline event');
        return;
      }
      
      const { username } = data;
      
      if (!username) {
        console.error('Missing username in user_offline event:', data);
        return;
      }
      
      setOnlineUsers(prev => {
        return {
          ...prev,
          [username]: false
        };
      });
    });
    
    // Set up initial status listener
    registerInitialStatusListener((data) => {
      if (!data || !data.friends) {
        console.log('No friends in initial status data');
        return;
      }
    
      // Update all online friends at once
      setOnlineUsers((prev) => {
        const newState = { ...prev };
    
        data.friends.forEach((friend) => {
          if (friend && friend.username) {
            newState[friend.username] = friend.online;
          }
        });
        return newState;
      });
    });
    
    requestInitialStatus();
    
    return () => {
      removeListener('user_online');
      removeListener('user_offline');
      removeListener('initial_status');
    };
  }, [socketReady]);

  // Function to load message previews for all friends
  const loadMessagePreviews = async (token, friendsList) => {
    try {
      // Get message previews for all friends in one API call
      const previewsData = await getAllMessagePreviews(token);
      
      if (previewsData && previewsData.previews) {
        // Create a new object to store messages by username
        const newMessagesByUser = { ...messagesByUser };
        const newPreviews = {};
        
        // Process each preview
        previewsData.previews.forEach(preview => {
          const { username, lastMessage } = preview;
          
          // Add to previews if there's a last message
          if (lastMessage) {
            newPreviews[username] = lastMessage;
            
            // If we don't already have messages for this user in state, initialize with the preview
            if (!messagesByUser[username] || messagesByUser[username].length === 0) {
              newMessagesByUser[username] = [lastMessage];
            }
          } else {
            // No message yet for this friend
            newPreviews[username] = { text: "No messages yet", time: "" };
          }
        });
        
        // Update both states
        setMessagePreviews(newPreviews);
        setMessagesByUser(newMessagesByUser);
      }
    } catch (err) {
      console.error("Error loading message previews:", err);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get last message for each friend
  const getLastMessage = (username) => {
    // First check message previews for initial load
    if (messagePreviews[username]) {
      return messagePreviews[username].text || "No messages yet";
    }
   
    // Then check active message state for updates during session
    if (messagesByUser[username] && messagesByUser[username].length > 0) {
      const messages = messagesByUser[username];
      const lastMessage = messages[messages.length - 1];
      return lastMessage.text;
    }
   
    return "No messages yet";
  };

  return (
    <div className="flex-1 bg-white flex flex-col shadow-lg rounded-lg p-3 overflow-hidden">
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
          <LoadingAnimation size="medium" color="ucd-blue" />
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                    selectedUser === friend.username ? 'bg-ucd-blue-200 text-ucd-blue-900' : 'bg-ucd-blue-600 text-white'
                  }`}>
                    {friend.avatar ? (
                      <img 
                        src={friend.avatar} 
                        alt={friend.username.charAt(0).toUpperCase()}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      friend.username.charAt(0).toUpperCase()
                    )}
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