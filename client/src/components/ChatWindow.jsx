import React, { useEffect, useRef } from 'react';

export default function ChatWindow({ messages }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a flag to determine if this is an initial load
    const isInitialLoad = chatContainerRef.current.scrollTop === 0 && 
                          chatContainerRef.current.scrollHeight > chatContainerRef.current.clientHeight;
    
    if (isInitialLoad) {
      // For initial load, instantly jump to the bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      // For new messages during conversation, use smooth scrolling
      scrollToBottom();
    }
  }, [messages]);

  // Function to scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 flex flex-col p-4 overflow-y-auto bg-white shadow-lg rounded-lg m-4"
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-3 max-w-[75%] mb-2 rounded-lg ${
            msg.sender === 'Me' ? 'bg-ucd-blue-500 text-white self-end' : 'bg-ucd-blue-300 text-black self-start'
          }`}
        >
          <p>{msg.text}</p>
          <span className="text-xs text-ucd-blue-700 block mt-1">{msg.time}</span>
        </div>
      ))}
      {/* Empty div used as a reference to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
}