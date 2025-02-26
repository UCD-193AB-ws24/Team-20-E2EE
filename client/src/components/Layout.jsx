import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import Archive from '../pages/Archive';
import Friends from '../pages/Friends';
import Requests from '../pages/Requests';

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

const archivedMessages = {
  Alice: {
    messages: [
      { sender: 'Alice', text: 'Archived message 1', time: '10:00 AM' },
      { sender: 'Me', text: 'Archived reply 1', time: '10:02 AM' },
    ],
    mostRecentMessage: 'Archived reply 1',
  },
  Bob: {
    messages: [
      { sender: 'Bob', text: 'Archived message 2', time: '12:30 PM' },
      { sender: 'Me', text: 'Archived reply 2', time: '12:35 PM' },
    ],
    mostRecentMessage: 'Archived reply 2',
  },
};

export default function Layout({ children }) {
  const [selectedUser, setSelectedUser] = useState('Alice');
  const [messages, setMessages] = useState(mockMessages[selectedUser].messages);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [view, setView] = useState('chat');

  useEffect(() => {
    if (view === 'archive') {
      setMessages(archivedMessages[selectedUser]?.messages || []);
    } else {
      setMessages(mockMessages[selectedUser]?.messages || []);
    }
  }, [selectedUser, view]);

  const sendMessage = async (text) => {
    const newMessage = { sender: 'Me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="h-screen flex bg-ucd-blue-light">
      {/* Navigation Bar */}
      <NavBar onProfileClick={() => setShowProfileModal(true)} setView={setView} />

      {/* Side Bar */}
      <div className="min-w-[250px] flex flex-col bg-ucd-blue-light">
        {view === 'archive' ? (
          <Archive selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
        ) : view === 'friends' ? (
          <Friends selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
        ) : view === 'requests' ? (
          <Requests selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
        ) : (
          React.cloneElement(children, { selectedUser, setSelectedUser })
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white shadow-lg rounded-lg m-4">
        <div className="p-4">
          <h2 className="text-xl font-bold text-ucd-blue-900">
            {selectedUser} {view === 'archive' && '(Archive)'}
          </h2>
        </div>
        <ChatWindow messages={messages} />
        <MessageInput sendMessage={sendMessage} />
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}