// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatList from '../components/ChatList'; 
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';

const mockMessages = {
  Alice: [
    { sender: 'Alice', text: 'Hey! How are you?', time: '10:00 AM' },
    { sender: 'Me', text: 'I am good! How about you?', time: '10:02 AM' },
  ],
  Bob: [
    { sender: 'Bob', text: 'Want to grab lunch?', time: '12:30 PM' },
    { sender: 'Me', text: 'Sure, what time?', time: '12:35 PM' },
  ],
  Charlie: [
    { sender: 'Charlie', text: 'Let’s catch up soon!', time: '5:45 PM' },
    { sender: 'Me', text: 'Absolutely! Let me know when.', time: '5:47 PM' },
  ],
};

export default function Home() {
  const [selectedUser, setSelectedUser] = useState('Alice');
  const [messages, setMessages] = useState(mockMessages[selectedUser]);

  useEffect(() => {
    setMessages(mockMessages[selectedUser] || []);
  }, [selectedUser]);

  const sendMessage = (text) => {
    const newMessage = { sender: 'Me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="h-screen flex">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Chat List (List of Conversations) */}
      <ChatList users={Object.keys(mockMessages)} selectedUser={selectedUser} setSelectedUser={setSelectedUser} />

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-300">
          <h2 className="text-xl font-bold">{selectedUser}</h2>
        </div>
        <ChatWindow messages={messages} />
        <MessageInput sendMessage={sendMessage} />
      </div>
    </div>
  );
}
