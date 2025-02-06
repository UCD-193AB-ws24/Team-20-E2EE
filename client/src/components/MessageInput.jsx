// src/components/MessageInput.jsx
import React, { useState } from 'react';

export default function MessageInput({ sendMessage }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() !== '') {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <div className="border-t p-2 bg-gray-50 flex">
      <input
        type="text"
        className="flex-1 border rounded px-3 py-2 focus:outline-none"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button className="ml-2 bg-blue-500 text-white px-4 py-2 rounded" onClick={handleSend}>
        Send
      </button>
    </div>
  );
}
