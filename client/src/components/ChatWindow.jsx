import React, { use, useEffect, useRef, useState } from 'react';
import { getAvatar } from '../api/user';
import { useAppContext } from './AppContext';
import { toggleArchive, archiveEnabledCheck, checkUserOptInStatus } from '../api/messages';
import { searchUsername, searchFriendUid } from '../api/friends';

export default function ChatWindow({ messages, selectedUser, selectedUserID }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [avatars, setAvatars] = useState({});
  const [usernames, setUsernames] = useState({});
  const [archiveEnabled, setArchiveEnabled] = useState(false);
  const [mutualArchive, setMutualArchive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const currentUsername = JSON.parse(localStorage.getItem('user'))?.username;
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.uid;
  const { theme } = useAppContext();
  const isGroupChat = (typeof selectedUser === 'object' && selectedUser.type === 'group');

  // Unified loading state - true if either avatars or messages are loading
  const isLoading = avatarsLoading || messagesLoading;

  // Track messages loading state
  useEffect(() => {
    if (selectedUser) {
      setMessagesLoading(true);
      // Reset messages loading after a brief delay to allow new messages to load
      const timer = setTimeout(() => {
        setMessagesLoading(false);
      }, 300); // Increased delay to ensure messages are fully loaded
      return () => clearTimeout(timer);
    } else {
      setMessagesLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    const loadAvatars = async () => {
      try {
        setAvatarsLoading(true); 
        const newAvatars = {};
        const newUsernames = {};

        // Load current user's avatar
        if (currentUsername) {
          const myAvatar = await getAvatar(currentUsername);
          newAvatars[currentUsername] = myAvatar;
          newUsernames[currentUsername] = currentUsername;
        }

        if (isGroupChat) {
          // Get all unique sender IDs from messages
          const allSenderIds = [...new Set(messages.map(msg => msg.sender).filter(sender => sender !== 'Me'))];
          
          // Load avatars for all senders (including those who may have left the group)
          const avatarPromises = allSenderIds.map(async (senderId) => {
            try {
              // Get username from senderId
              const response = await searchUsername(senderId);
              const { username } = response;

              if (username) {
                const avatar = await getAvatar(username);
                newAvatars[username] = avatar;
                newUsernames[senderId] = username;
              } else {
                // Fallback for users who left or can't be found
                newUsernames[senderId] = `User ${senderId.slice(0, 8)}`;
              }
            } catch (err) {
              console.error(`Error loading avatar for user ID ${senderId}:`, err);
              // Fallback for users who left or can't be found
              newUsernames[senderId] = `User ${senderId.slice(0, 8)}`;
            }
          });

          // Also load avatars for current group members
          if (selectedUser.members) {
            const memberPromises = selectedUser.members.map(async (userId) => {
              if (!allSenderIds.includes(userId)) {
                try {
                  const response = await searchUsername(userId);
                  const { username } = response;

                  if (username) {
                    const avatar = await getAvatar(username);
                    newAvatars[username] = avatar;
                    newUsernames[userId] = username;
                  }
                } catch (err) {
                  console.error(`Error loading avatar for member ${userId}:`, err);
                }
              }
            });

            await Promise.all([...avatarPromises, ...memberPromises]);
          } else {
            await Promise.all(avatarPromises);
          }
        } else {
          // Single user chat - selectedUser is already a username
          const otherUserAvatar = await getAvatar(selectedUser);
          newAvatars[selectedUser] = otherUserAvatar;
        }

        // Only update state once all data is loaded
        setAvatars(newAvatars);
        setUsernames(newUsernames);
      } catch (error) {
        console.error('Error loading avatars:', error);
      } finally {
        setAvatarsLoading(false);
      }
    };

    // Reset states when switching chats to prevent showing old data
    if (selectedUser) {
      setAvatars({});
      setUsernames({});
      loadAvatars();
    } else {
      setAvatarsLoading(false);
    }
  }, [selectedUser, currentUsername, isGroupChat]);

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!selectedUserID || !currentUserId) return;

      const userOptIn = await checkUserOptInStatus(currentUserId, selectedUserID);
      const isMutual = await archiveEnabledCheck(selectedUser);

      setArchiveEnabled(userOptIn);
      setMutualArchive(isMutual);
    };

    fetchStatuses();
  }, [selectedUserID]);

  const handleArchiveToggle = async () => {
    if (!selectedUserID || !currentUserId) return;
    setLoading(true);
    const result = await toggleArchive(selectedUserID, !archiveEnabled);
    setArchiveEnabled(result);
    setLoading(false);
  };

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!chatContainerRef.current || isLoading) return;
    
    const container = chatContainerRef.current;
    const isInitialLoad =
      container.scrollTop === 0 &&
      container.scrollHeight > container.clientHeight;

    if (isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isLoading]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Show unified loading state 
  if (isLoading) {
    return (
      <div 
        className="flex-1 flex items-center justify-center rounded-lg m-4"
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mb-4">
            <style>{`
              @keyframes pulse {
                0%, 100% { 
                  transform: scale(1);
                  opacity: 1;
                }
                50% { 
                  transform: scale(1.1);
                  opacity: 0.7;
                }
              }
              .pulse-logo {
                animation: pulse 1.5s ease-in-out infinite;
              }
            `}</style>
            <img 
              className="w-full h-full pulse-logo" 
              src="/images/ema-logo.png" 
              alt="Loading" 
            />
          </div>
          <p style={{ color: theme.colors.text.primary }}>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!isGroupChat) {
    return (
      <div
        ref={chatContainerRef}
        className="flex-1 flex flex-col p-4 overflow-y-auto rounded-lg m-4"
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        {selectedUser && (
          <div 
          className="absolute top-2 right-4 flex items-center mt-2 space-x-2 text-sm"
          style={{color: theme.colors.text}}>
            <label htmlFor="archive-toggle text-black">Archive On/Off</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={archiveEnabled ?? false}
                onChange={handleArchiveToggle}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-500 transition-all duration-300"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-100 peer-checked:translate-x-5"></div>
            </label>
          </div>
        )}
        
        {/* No messages placeholder */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-medium mb-2" style={{ color: theme.colors.text.secondary }}>
              No messages yet
            </p>
            <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
              Start a conversation with {selectedUser}
            </p>
          </div>
        ) : (
          // Existing messages rendering
          messages.map((msg, index) => {
            const showAvatar =
              index === 0 || messages[index - 1].sender !== msg.sender;
            const isMe = msg.sender === 'Me';

            return (
              <div
                key={index}
                className={`flex items-start mb-2 ${isMe ? 'justify-end' : 'justify-start'
                  }`}
              >
                {!isMe && (
                  <div className="flex items-center">
                    {showAvatar ? (
                      <img
                        src={avatars[selectedUser] || 'https://via.placeholder.com/40'}
                        className="w-8 h-8 rounded-full mr-2"
                        alt={`${selectedUser}'s avatar`}
                      />
                    ) : (
                      <div className="w-8 h-8 mr-2" />
                    )}
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={'p-3 max-w-[75%] rounded-lg'}
                  style={{ backgroundColor: isMe ? theme.colors.chatBubble.primary : theme.colors.chatBubble.secondary }}
                >
                  <p>{msg.text}</p>
                  <span className="text-xs block mt-1">
                    {msg.time}
                  </span>
                </div>

                {isMe && (
                  <div className="flex items-center">
                    {showAvatar ? (
                      <img
                        src={avatars[currentUsername] || 'https://via.placeholder.com/40'}
                        className="w-8 h-8 rounded-full ml-2"
                        alt="My avatar"
                      />
                    ) : (
                      <div className="w-8 h-8 ml-2" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  }
  else {
    return (
      <div
        ref={chatContainerRef}
        className="flex-1 flex flex-col p-4 overflow-y-auto rounded-lg m-4"
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        {/* No messages placeholder for group chat */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 mb-4 opacity-50">
              <img 
                src="/images/ema-logo.png" 
                alt="No messages" 
                className="w-full h-full"
              />
            </div>
            <p className="text-lg font-medium mb-2" style={{ color: theme.colors.text.secondary }}>
              No messages yet
            </p>
            <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
              Start the conversation in {selectedUser.name || 'this group'}
            </p>
          </div>
        ) : (
          // Existing group messages rendering
          messages.map((msg, index) => {
            const showAvatar =
              index === 0 || messages[index - 1].sender !== msg.sender;
            const isMe = msg.sender === 'Me';
            const senderId = isMe ? 'Me' : msg.sender;

            // Get the username for this sender ID, or fallback to a truncated ID
            const senderUsername = usernames[senderId] || `User ${senderId.slice(0, 8)}`;

            return (
              <div
                key={index}
                className={`flex items-start mb-2 ${isMe ? 'justify-end' : 'justify-start'
                  }`}
              >
                {!isMe && (
                  <div className="flex items-center">
                    {showAvatar ? (
                      <img
                        src={avatars[senderUsername] || avatars[senderId] || 'https://via.placeholder.com/40'}
                        className="w-8 h-8 rounded-full mr-2"
                        alt={`${senderUsername}'s avatar`}
                      />
                    ) : (
                      <div className="w-8 h-8 mr-2" />
                    )}
                  </div>
                )}

                <div className="flex flex-col">
                  {/* Username above bubble for non-me messages */}
                  {!isMe && showAvatar && (
                    <span className="text-xs font-semibold text-gray-700 ml-1 mb-1">
                      {senderUsername}
                    </span>
                  )}

                  {/* Message bubble */}
                  <div
                    className={'p-3 max-w-[100%] rounded-lg'}
                    style={{ backgroundColor: isMe ? theme.colors.chatBubble.primary : theme.colors.chatBubble.secondary }}
                  >
                    <p>{msg.text}</p>
                    <span className="text-xs block mt-1">
                      {msg.time}
                    </span>
                  </div>
                </div>

                {isMe && (
                  <div className="flex items-center">
                    {showAvatar ? (
                      <img
                        src={avatars[currentUsername] || 'https://via.placeholder.com/40'}
                        className="w-8 h-8 rounded-full ml-2"
                        alt="My avatar"
                      />
                    ) : (
                      <div className="w-8 h-8 ml-2" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  }
}