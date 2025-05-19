import React, { useEffect, useRef, useState } from 'react';
import { getAvatar } from '../api/user';
import { useAppContext } from './AppContext';
import { toggleArchive, archiveEnabledCheck } from '../api/messages';

export default function ChatWindow({ messages, selectedUser, selectedUserID }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [avatars, setAvatars] = useState({});
  const [archiveEnabled, setArchiveEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUsername = JSON.parse(localStorage.getItem('user'))?.username;
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.uid;
  const { theme } = useAppContext();

  // Load avatars when selectedUser changes
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        if (selectedUser) {
          const otherUserAvatar = await getAvatar(selectedUser);
          if (currentUsername) {
            const myAvatar = await getAvatar(currentUsername);
            setAvatars({
              [selectedUser]: otherUserAvatar,
              [currentUsername]: myAvatar
            });
          }
        }
      } catch (error) {
        console.error('Error loading avatars:', error);
      }
    };

    loadAvatars();
  }, [selectedUser, currentUsername]);

  useEffect(() => {
    const fetchArchiveStatus = async () => {
      if (!selectedUserID || !currentUserId) return;
      const enabled = await archiveEnabledCheck(currentUserId, selectedUserID);
      setArchiveEnabled(enabled);
    };
    fetchArchiveStatus();
  }, [selectedUser]);

  const handleArchiveToggle = async () => {
    if (!selectedUserID || !currentUserId) return;
    setLoading(true);
    const result = await toggleArchive(currentUserId, selectedUserID, !archiveEnabled);
    setArchiveEnabled(result);
    setLoading(false);
  };

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    const isInitialLoad =
      chatContainerRef.current.scrollTop === 0 &&
      chatContainerRef.current.scrollHeight > chatContainerRef.current.clientHeight;

    if (isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 flex flex-col p-4 overflow-y-auto rounded-lg m-4"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >
      {selectedUser && (
        <div className="absolute top-2 right-4 flex items-center space-x-2 text-sm text-white">
          <label htmlFor="archive-toggle">Archive with {selectedUserID}</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={archiveEnabled ?? false}
              onChange={handleArchiveToggle}
              disabled={loading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-500 rounded-full peer peer-checked:bg-yellow-500 transition-all duration-300"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-5"></div>
          </label>
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