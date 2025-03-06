import React from 'react';

export default function ChatWindow({ messages }) {
  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-white shadow-lg rounded-lg m-4">
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
    </div>
  );
}