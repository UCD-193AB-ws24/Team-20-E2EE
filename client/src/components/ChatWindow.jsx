import React, { useEffect, useRef, useState } from 'react';
import { getAvatar } from '../api/user';
import { useAppContext } from './AppContext';
import { searchUsername, searchFriendUid } from '../api/friends';

export default function ChatWindow({ messages, selectedUser, selectedUserID }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [avatars, setAvatars] = useState({});
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(false);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const currentUsername = currentUser?.username;
  const currentUserId = currentUser?.uid;

  const { theme } = useAppContext();
  const isGroupChat = typeof selectedUser === 'object' && selectedUser.type === 'group';
  const isLoading = avatarsLoading || messagesLoading;

  useEffect(() => {
    if (selectedUser) {
      setMessagesLoading(true);
      const timer = setTimeout(() => setMessagesLoading(false), 300);
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

        if (currentUsername) {
          newAvatars[currentUsername] = await getAvatar(currentUsername);
          newUsernames[currentUserId] = currentUsername;
        }

        if (isGroupChat) {
          const senderIds = [...new Set(messages.map(msg => msg.sender).filter(s => s !== 'Me'))];

          const avatarTasks = senderIds.map(async (senderId) => {
            try {
              const { username } = await searchUsername(senderId);
              newAvatars[username] = await getAvatar(username);
              newUsernames[senderId] = username;
            } catch {
              newUsernames[senderId] = `User ${senderId.slice(0, 8)}`;
            }
          });

          if (selectedUser.members) {
            selectedUser.members.forEach((uid) => {
              if (!newUsernames[uid]) {
                avatarTasks.push(
                  searchUsername(uid).then(async ({ username }) => {
                    newAvatars[username] = await getAvatar(username);
                    newUsernames[uid] = username;
                  }).catch(() => { })
                );
              }
            });
          }

          await Promise.all(avatarTasks);
        } else if (typeof selectedUser === 'string') {
          newAvatars[selectedUser] = await getAvatar(selectedUser);
        }

        setAvatars(newAvatars);
        setUsernames(newUsernames);
      } catch (err) {
        console.error('Avatar load error:', err);
      } finally {
        setAvatarsLoading(false);
      }
    };

    if (selectedUser) {
      setAvatars({});
      setUsernames({});
      loadAvatars();
    } else {
      setAvatarsLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!chatContainerRef.current || isLoading) return;
    const container = chatContainerRef.current;
    const isInitial = container.scrollTop === 0 && container.scrollHeight > container.clientHeight;
    if (isInitial) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-lg m-4" style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="text-center">
          <div className="w-20 h-20 mb-4">
            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
              }
              .pulse-logo { animation: pulse 1.5s ease-in-out infinite; }
            `}</style>
            <img src="/images/ema-logo.png" alt="Loading" className="w-full h-full pulse-logo" />
          </div>
          <p style={{ color: theme.colors.text.primary }}>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 flex flex-col p-4 overflow-y-auto rounded-lg m-4"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-medium mb-2" style={{ color: theme.colors.text.secondary }}>
            No messages yet
          </p>
          <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
            Start a conversation with {isGroupChat ? selectedUser.name || 'this group' : selectedUser}
          </p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isMe = msg.sender === 'Me';
          const senderId = isMe ? currentUserId : msg.sender;
          const username = isMe ? currentUsername : usernames[senderId] || `User ${senderId?.slice?.(0, 8)}`;
          const showAvatar = index === 0 || messages[index - 1].sender !== msg.sender;

          return (
            <div key={index} className={`flex items-start mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="flex items-center">
                  {showAvatar ? (
                    <img
                      src={avatars[username] || avatars[senderId] || 'https://via.placeholder.com/40'}
                      className="w-8 h-8 rounded-full mr-2"
                      alt={`${username}'s avatar`}
                    />
                  ) : (
                    <div className="w-8 h-8 mr-2" />
                  )}
                </div>
              )}

              <div className="flex flex-col">
                {!isMe && showAvatar && (
                  <span className="text-xs font-semibold text-gray-700 ml-1 mb-1">
                    {username}
                  </span>
                )}
                <div
                  className="p-3 max-w-[75%] rounded-lg"
                  style={{ backgroundColor: isMe ? theme.colors.chatBubble.primary : theme.colors.chatBubble.secondary }}
                >
                  <p
                    title={msg.blur ? 'This message is blurred. Hover to reveal.' : ''}
                    className={`transition duration-300 ${msg.blur ? 'blur-sm hover:blur-none text-gray-500 cursor-pointer' : ''}`}
                  >
                    {msg.text}
                  </p>
                  <span className="text-xs block mt-1">{msg.time}</span>
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
