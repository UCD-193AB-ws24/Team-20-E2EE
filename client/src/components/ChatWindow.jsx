import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from './AppContext';

export default function ChatWindow({ messages, selectedUser }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { avatarCache } = useAppContext();

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

          return (
            <div
              key={index}
              className={`flex items-start mb-2 ${
                msg.sender === 'Me' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender !== 'Me' && (
                <div className="flex items-center">
                  {showAvatar ? (
                    <img
                      src={avatarCache[selectedUser] || 'https://via.placeholder.com/40'}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-8 h-8 mr-2" />
                  )}
                </div>
              )}
          
              {/* Message bubble */}
              <div
                className={`p-3 max-w-[75%] rounded-lg ${
                  msg.sender === 'Me'
                    ? 'bg-ucd-blue-500 text-white self-end'
                    : 'bg-ucd-blue-300 text-black self-start'
                }`}
              >
                <p>{msg.text}</p>
                <span className="text-xs text-ucd-blue-700 block mt-1">
                  {msg.time}
                </span>
              </div>
          
              {msg.sender === 'Me' && (
                <div className="flex items-center">
                  {showAvatar ? (
                    <img
                      src={avatarCache[JSON.parse(localStorage.getItem('user')).username] || 'https://via.placeholder.com/40'}
                      className="w-8 h-8 rounded-full ml-2"
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