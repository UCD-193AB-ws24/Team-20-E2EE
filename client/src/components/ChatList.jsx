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
  registerMessageListener,
  registerMessageSentListener
} from '../api/socket';
import { getAvatar } from '../api/user';
import { LoadingAnimation, useSocket, useAppContext } from './index';
import { motion } from "motion/react";

export default function ChatList({ selectedUser, setSelectedUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [messagePreviews, setMessagePreviews] = useState({});
  const { socketReady } = useSocket();
  const { theme } = useAppContext();


  // Load message previews for each friend
  const loadMessagePreviews = async () => {
    try {
      const data = await getAllMessagePreviews();
      const previews = {};
      
      (data.previews || []).forEach(preview => {
        previews[preview.username] = preview.lastMessage;
      });
      
      setMessagePreviews(previews);
    } catch (err) {
      console.error("Error loading message previews:", err);
    }
  };

  // Fetch friends list on component mount
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const data = await getFriendList();
        
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
        
        // Load message previews
        await loadMessagePreviews();
      } catch (err) {
        console.error("Error loading friends:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFriends();
  }, []);

  // Set up online status listeners
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

  // Set up message listeners
  useEffect(() => {
    if (!socketReady) {
      console.log('Socket not ready, skipping message listener setup');
      return;
    }
  
    console.log('Setting up message listeners');
  
    // Listen for incoming messages
    const removeMessageListener = registerMessageListener((data) => {
      const { sender, text } = data;
      
      console.log('Received message event:', { sender, text });
      
      // Update message preview for this sender
      setMessagePreviews(prev => {
        console.log('Updating preview for:', sender);
        return {
          ...prev,
          [sender]: {
            sender,
            text,
            timestamp: new Date()
          }
        };
      });
    });
  
    // Listen for sent messages
    const removeMessageSentListener = registerMessageSentListener((data) => {
      const { recipient, text } = data;
      
      console.log('Message sent event received:', data);
    
      setMessagePreviews(prev => {
        console.log('Updating preview for recipient:', recipient);
        return {
          ...prev,
          [recipient]: {
            sender: "Me",
            text,
            timestamp: new Date()
          }
        };
      });
    });
  
    console.log('Message listeners set up successfully');
    
    return () => {
      console.log('Cleaning up message listeners');
      removeMessageListener();
      removeMessageSentListener();
    };
  }, [socketReady, selectedUser]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Same day - show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Yesterday
    else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    // This week - show day name
    else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    // Older - show date
    else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort friends by most recent message
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const previewA = messagePreviews[a.username];
    const previewB = messagePreviews[b.username];
    
    if (!previewA && !previewB) return 0;
    if (!previewA) return 1;
    if (!previewB) return -1;
    
    return new Date(previewB.timestamp) - new Date(previewA.timestamp);
  });

  return (
    <div 
      className="flex-1 flex flex-col shadow-lg rounded-lg p-1 overflow-hidden"
      style={{backgroundColor: theme.colors.background.secondary}}
    >
      <div className="p-3">
        <h2 className="text-2xl font-bold text-ucd-blue-900">Chats</h2>
      </div>
  
      <div className="px-2 pb-2 relative">
        <MdSearch className="absolute left-6 top-4 transform -translate-y-1/2 text-ucd-blue-600" />
        <input
          type="text"
          placeholder="Search for a user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-8 p-1 pl-10 rounded-full focus:outline-none focus:ring-1"
          style={{backgroundColor: theme.colors.background.primary}}
        />
      </div>
  
      {isLoading ? (
        <div className="flex justify-center p-5">
          <LoadingAnimation size="medium" color="ucd-blue" />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-1">
          {sortedFriends.length === 0 ? (
            <p className="p-4 text-gray-500">No chats found</p>
          ) : (
            sortedFriends.map((friend, index) => {
              const preview = messagePreviews[friend.username];
              
              return (
                <motion.li
                  key={friend.username}
                  className="flex items-center p-4 mb-2 rounded-lg h-[70px]"
                  initial={false}
                  animate={{ 
                    backgroundColor: selectedUser === friend.username 
                      ? theme.colors.background.primary 
                      : theme.colors.background.secondary 
                  }}
                  whileHover={{ backgroundColor: theme.colors.background.primary }}
                  whileTap={{ backgroundColor: theme.colors.background.secondary }}
                  onClick={() => setSelectedUser(friend.username)}
                >
                  <div className="relative">
                    <div className={'w-12 h-12 rounded-full flex items-center justify-center overflow-hidden'}>
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
                  <div className="flex flex-col justify-center flex-1 overflow-hidden ml-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold truncate">{friend.username}</span>
                      {preview && (
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(preview.timestamp)}
                        </span>
                      )}
                    </div>
                    {preview && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {preview.sender === "Me" ? "You: " : `${preview.sender}: `}
                        {preview.text}
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}