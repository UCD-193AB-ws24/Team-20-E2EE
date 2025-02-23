import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';

const mockMessages = {
  Alice: {
    messages: [
      { sender: 'Alice', text: 'Hey! How are you?', time: '10:00 AM' },
      { sender: 'Me', text: 'I am good! How about you?', time: '10:02 AM' },
    ],
    mostRecentMessage: 'I am good! How about you?',
  },
  Bob: {
    messages: [
      { sender: 'Bob', text: 'Want to grab lunch?', time: '12:30 PM' },
      { sender: 'Me', text: 'Sure, what time?', time: '12:35 PM' },
    ],
    mostRecentMessage: 'Sure, what time?',
  },
  Charlie: {
    messages: [
      { sender: 'Charlie', text: 'Let’s catch up soon!', time: '5:45 PM' },
      { sender: 'Me', text: 'Absolutely! Let me know when.', time: '5:47 PM' },
    ],
    mostRecentMessage: 'Absolutely! Let me know when.',
  },
};

export default function Layout({ children }) {
  const [selectedUser, setSelectedUser] = useState('Alice');
  const [messages, setMessages] = useState(mockMessages[selectedUser].messages);

  useEffect(() => {
    setMessages(mockMessages[selectedUser].messages || []);
  }, [selectedUser]);

  const sendMessage = async (text) => {
    const newMessage = { sender: 'Me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="h-screen flex bg-ucd-blue-light">
      {/* Navigation Bar */}
      <NavBar />

      {/* Side Bar */}
      <div className="min-w-[250px] flex flex-col bg-ucd-blue-light">
        {React.cloneElement(children, { selectedUser, setSelectedUser })}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white shadow-lg rounded-lg m-4">
        <div className="p-4">
          <h2 className="text-xl font-bold text-ucd-blue-900">{selectedUser}</h2>
        </div>
        <ChatWindow messages={messages} />
        <MessageInput sendMessage={sendMessage} />
      </div>
    </div>
  );
}