import React, { useState } from 'react';

export default function MessageInput({ sendMessage }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-lg m-4 flex">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 p-2 border border-ucd-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ucd-gold-600"
        placeholder="Type your message..."
      />
      <button type="submit" className="ml-2 p-2 bg-ucd-gold-600 text-white rounded-lg">
        Send
      </button>
    </form>
  );
}