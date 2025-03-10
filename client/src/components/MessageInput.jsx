import React, { useState } from 'react';

export default function MessageInput({ sendMessage, onTyping, disabled = false }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim() && !isSending) {
      setIsSending(true);
      try {
        await sendMessage(text);
        setText('');
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Trigger typing indicator
    if (onTyping && e.target.value.trim()) {
      onTyping();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-lg m-4 flex">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        className={`flex-1 p-2 border border-ucd-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucd-gold-600 ${disabled ? 'bg-gray-100' : ''}`}
        placeholder={disabled ? "Select a user to chat" : "Type your message..."}
        disabled={disabled || isSending}
      />
      <button 
        type="submit" 
        className={`ml-2 p-2 ${disabled || isSending ? 'bg-gray-400' : 'bg-ucd-gold-600'} text-black rounded-lg`}
        disabled={disabled || isSending}
      >
        {isSending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}