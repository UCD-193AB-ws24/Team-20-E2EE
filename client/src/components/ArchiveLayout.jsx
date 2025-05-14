import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal } from './index';
import { Archive, Friends, Requests } from '../pages';
import { getChatArchive } from '../api/messages';
import { useAppContext } from './AppContext';

const initialMessagesState = {};

export default function ArchiveLayout({ children }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesByUser, setMessagesByUser] = useState(initialMessagesState);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [view, setView] = useState('archive');
  const { appReady, theme } = useAppContext();

  const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.accessToken || null;
  };

  useEffect(() => {
    const loadChatArchive = async () => {
      if (!selectedUser) return;
      const token = getToken();
      if (!token) return;

      try {
        const { messages: archivedMessages } = await getChatArchive(token, selectedUser);
        setMessagesByUser(prev => ({
          ...prev,
          [selectedUser]: archivedMessages || []
        }));
        setMessages(archivedMessages || []);
      } catch (err) {
        console.error("Error fetching archived chat history:", err);
      }
    };

    loadChatArchive();
  }, [selectedUser]);

  if (!appReady) {
    return (
      <div className="flex items-center justify-center h-screen"
           style={{ backgroundColor: theme.colors.background.primary, color: theme.colors.text.primary }}>
        <h1 className="text-lg">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="h-screen flex" style={{ backgroundColor: theme.colors.background.primary, color: theme.colors.text.primary }}>
      <NavBar onProfileClick={() => setShowProfileModal(true)} setView={setView} />

      <div className="min-w-[250px] w-[25%] m-3 flex flex-col">
        <Archive selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
      </div>

      <div className="flex-1 flex flex-col shadow-lg rounded-lg m-3 ml-0"
           style={{ backgroundColor: theme.colors.background.secondary }}>
        <div className="p-4">
          <h2 className="text-xl font-bold">
            {selectedUser || 'Select a user to view archive'} {selectedUser && ' (Archive)'}
          </h2>
        </div>
        <ChatWindow messages={messages} selectedUser={selectedUser} />
        <MessageInput disabled={true} />
      </div>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  );
}
