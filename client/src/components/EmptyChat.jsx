import React from 'react';
import { useAppContext } from './AppContext';

export default function EmptyChat() {
  const { theme } = useAppContext();

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: theme.colors.background.secondary }}
    >
      <div className="text-center">
        <img
          src={theme.type === 'light' ? "/images/emptychaticon-light.png" : "/images/emptychaticon-dark.png"}
          alt="empty chat"
          className="w-32 h-32 mb-8 mx-auto"
        />
        <h2 className="text-2xl font-bold mb-4" style={{ color: theme.type === 'light' ? '#000000' : theme.colors.text.primary }}>
          Welcome to EMA Chat
        </h2>
        <p className="text-lg mb-6" style={{ color: theme.type === 'light' ? '#000000' : theme.colors.text.secondary }}>
          Select a chat from the list to start messaging
        </p>
        <p className="text-lg mb-6" style={{ color: theme.type === 'light' ? '#000000' : theme.colors.text.secondary }}>
          Warning: Activating archive will disable encryption temporarily as messages will be stored. Deselect it to delete all archive.
        </p>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <h4 style={{ color: theme.type === 'light' ? '#000000' : theme.colors.text.secondary }}>
              Online friends are marked with a green dot
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
} 