import React, { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import Archive from '../pages/Archive';
import Friends from '../pages/Friends';
import Requests from '../pages/Requests';
import { 
  initializeSocket, disconnectSocket, sendPrivateMessage,
  registerMessageListener, registerMessageSentListener,
  removeListener, sendTypingStatus, registerTypingListener
} from '../api/socket';
import { getChatHistory } from '../api/messages';

// Initialize with empty data structure
const initialMessagesState = {};

export default function Layout({ children }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesByUser, setMessagesByUser] = useState(initialMessagesState);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [view, setView] = useState('chat');
  const [isTyping, setIsTyping] = useState({});
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.idToken) {
      initializeSocket(user.idToken);
      
      // Clean up socket connection on component unmount
      return () => {
        disconnectSocket();
      };
    }
  }, []);

  // Load chat history when selected user changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedUser) return;
      
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user?.idToken) return;
        
        // Always fetch the chat history from the server when a user is selected
        const { messages: chatHistory } = await getChatHistory(user.idToken, selectedUser);
        
        // Update messages for this user
        setMessagesByUser(prev => ({
          ...prev,
          [selectedUser]: chatHistory || []
        }));
        
        // Set current messages
        setMessages(chatHistory || []);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    
    if (view === 'chat') {
      loadChatHistory();
    }
  }, [selectedUser, view]);

  // Set up message listeners for real-time communication
  useEffect(() => {
    // Handle incoming messages
    registerMessageListener((message) => {
      console.log('Received message:', message);
      const { sender, text, time } = message;
      
      // Add message to the appropriate user's message list
      setMessagesByUser(prev => {
        const userMessages = prev[sender] || [];
        return {
          ...prev,
          [sender]: [...userMessages, { sender, text, time }]
        };
      });
      
      // If this is from the currently selected user, update current messages
      if (sender === selectedUser) {
        setMessages(prev => [...prev, { sender, text, time }]);
      }
    });
    
    // Handle confirmation of sent messages
    registerMessageSentListener((message) => {
      const { recipient, text, time } = message;
      
      // Add message to the appropriate user's message list
      setMessagesByUser(prev => {
        const userMessages = prev[recipient] || [];
        return {
          ...prev,
          [recipient]: [...userMessages, { sender: 'Me', text, time }]
        };
      });
      
      // If this is for the currently selected user, update current messages
      if (recipient === selectedUser) {
        setMessages(prev => [...prev, { sender: 'Me', text, time }]);
      }
    });
    
    // Handle typing indicators
    registerTypingListener((data) => {
      const { username, isTyping: typing } = data;
      setIsTyping(prev => ({
        ...prev,
        [username]: typing
      }));
      
      // Clear typing indicator after 3 seconds of inactivity
      if (typing) {
        setTimeout(() => {
          setIsTyping(prev => ({
            ...prev,
            [username]: false
          }));
        }, 3000);
      }
    });
    
    // Clean up listeners on unmount
    return () => {
      removeListener('receive_message');
      removeListener('message_sent');
      removeListener('user_typing');
    };
  }, [selectedUser]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedUser) return;
    
    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Send typing indicator
    sendTypingStatus(selectedUser, true);
    
    // Set timeout to stop typing indicator
    const timeout = setTimeout(() => {
      sendTypingStatus(selectedUser, false);
    }, 3000);
    
    setTypingTimeout(timeout);
  }, [selectedUser, typingTimeout]);

  // Send message function
  const sendMessage = async (text) => {
    if (!selectedUser || !text.trim()) return;
    
    // Send message via socket
    const sent = sendPrivateMessage(selectedUser, text);
    
    if (!sent) {
      console.error('Failed to send message: Socket not connected');
      // You could implement a fallback here or show an error
    }
    
    // Clear typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      sendTypingStatus(selectedUser, false);
    }
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
          React.cloneElement(children, {
            selectedUser,
            setSelectedUser,
            messagesByUser,
            setMessagesByUser,
            isTyping
          })
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white shadow-lg rounded-lg m-4">
        <div className="p-4">
          <h2 className="text-xl font-bold text-ucd-blue-900">
            {selectedUser || 'Select a user to start chatting'}
            {selectedUser && view === 'archive' && ' (Archive)'}
            {selectedUser && isTyping[selectedUser] && 
              <span className="ml-2 text-sm text-gray-500 italic">typing...</span>
            }
          </h2>
        </div>
        <ChatWindow messages={messages} />
        <MessageInput 
          sendMessage={sendMessage}
          onTyping={handleTyping}
          disabled={!selectedUser || view === 'archive'}
        />
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}