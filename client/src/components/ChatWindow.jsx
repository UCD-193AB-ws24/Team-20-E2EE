import React, { useEffect, useRef, useState } from 'react';
import { getAvatar } from '../api/user';
import { useAppContext } from './AppContext';

export default function ChatWindow({ messages, selectedUser }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { avatarCache } = useAppContext();
  const [avatars, setAvatars] = useState({});
  const currentUsername = JSON.parse(localStorage.getItem('user'))?.username;

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
    const isInitialLoad = 
      chatContainerRef.current.scrollTop === 0 && 
      chatContainerRef.current.scrollHeight > chatContainerRef.current.clientHeight;
    
    if (isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };
  });

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 flex flex-col p-4 overflow-y-auto bg-white rounded-lg m-4"
    >
      {messages.map((msg, index) => {
        const showAvatar =
          index === 0 || messages[index - 1].sender !== msg.sender;
        const isMe = msg.sender === 'Me';

          return (
            <div
              key={index}
              className={`flex items-start mb-2 ${
                isMe ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isMe && (
                <div className="flex items-center">
                  {showAvatar ? (
                    <img
                      src={avatarCache[selectedUser] || avatars[selectedUser] || 'https://via.placeholder.com/40'}
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
                className={`p-3 max-w-[75%] rounded-lg ${
                  isMe
                    ? 'bg-ucd-blue-500 text-white self-end'
                    : 'bg-ucd-blue-300 text-black self-start'
                }`}
              >
                <p>{msg.text}</p>
                <span className="text-xs text-ucd-blue-700 block mt-1">
                  {msg.time}
                </span>
              </div>
          
              {isMe && (
                <div className="flex items-center">
                  {showAvatar ? (
                    <img
                      src={avatarCache[currentUsername] || avatars[currentUsername] || 'https://via.placeholder.com/40'}
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