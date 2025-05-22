import React, { use, useEffect, useRef, useState } from 'react';
import { getAvatar } from '../api/user';
import { useAppContext } from './AppContext';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal } from './index';
import { Archive, Friends, Requests } from '../pages';

const initialMessagesState = {};

export default function ArchiveWindow({ messages, selectedUser, selectedUserID }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [avatars, setAvatars] = useState({});
  const [usernames, setUsernames] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [view, setView] = useState('archive');
  const [loading, setLoading] = useState(false);
  const { appReady, theme } = useAppContext();
  const currentUsername = JSON.parse(localStorage.getItem('user'))?.username;
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.uid;

  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const newAvatars = {};
        const newUsernames = {};

        // Load current user's avatar
        if (currentUsername) {
          const myAvatar = await getAvatar(currentUsername);
          newAvatars[currentUsername] = myAvatar;
          newUsernames[currentUsername] = currentUsername;
        }


        const otherUserAvatar = await getAvatar(selectedUser);

        newAvatars[selectedUser] = otherUserAvatar;

        setAvatars(newAvatars);
        setUsernames(newUsernames);
      } catch (error) {
        console.error('Error loading avatars:', error);
      }
    };

    loadAvatars();
  }, [selectedUser, currentUsername]);

  useEffect(() => {
    const isInitialLoad =
      chatContainerRef.current.scrollTop === 0 &&
      chatContainerRef.current.scrollHeight > chatContainerRef.current.clientHeight;

    if (isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  });

  if (!appReady) {
    return (
      <div className="flex items-center justify-center h-screen"
        style={{ backgroundColor: theme.colors.background.primary, color: theme.colors.text.primary }}>
        <h1 className="text-lg">Loading...</h1>
      </div>
    );
  }

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 flex flex-col p-4 overflow-y-auto rounded-lg m-4"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >
      {selectedUser && (
        <div className="absolute top-2 right-4 flex items-center space-x-2 text-sm text-white">
          <label htmlFor="archive-toggle">Archive with {selectedUserID}</label>
        </div>
      )}
      {messages.map((msg, index) => {
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
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}