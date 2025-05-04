import React, { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal, useSocket } from './index';
import { Archive, Friends, Requests } from '../pages';
import socket, { 
  registerMessageListener,removeListener, 
  sendTypingStatus, registerTypingListener
} from '../api/socket';
import { sendPrivateMessage, decryptMessage } from '../api/messages';
import { useAppContext } from './AppContext';
import getCurrentUser from '../util/getCurrentUser';
import {establishSession, hasSession} from '../util/encryption/sessionManager';
import {fetchKeyBundle} from '../api/keyBundle';
import { getConversationMessages } from '../util/messagesStore';

// Initialize with empty data structure
const initialMessagesState = {};

export default function Layout({ children }) {
  const [selectedUser, setSelectedUser] = useState()
  const [messages, setMessages] = useState([]);
  const [messagesByUser, setMessagesByUser] = useState(initialMessagesState);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [view, setView] = useState();
  const [isTyping, setIsTyping] = useState({});
  const [typingTimeout, setTypingTimeout] = useState(null);
  const { socketReady } = useSocket();
  const { appReady, theme } = useAppContext();
  const user = getCurrentUser();
  const userId = user?.uid;

  const [selectedUserInfo, setSelectedUserInfo] = useState({
    deviceId: null,
    uid: null
  });
 
  // Get initial view on mount
  useEffect(() => {
    const path = location.pathname;
    if (path === '/archive') {
      setView('archive');
    } else if (path === '/friends') {
      setView('friends');
    } else if (path === '/requests') {
      setView('requests');
    } else {
      setView('chat');
    }
  });

  // Load chat history when selected user changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedUser) return;
      
      try {
        console.log("Loading chat history for:", selectedUser);
        
        // 1. First fetch the recipient's key bundle to get their UID
        const recipientKeyBundle = await fetchKeyBundle(selectedUser);
        const recipientUid = recipientKeyBundle.keyBundle.uid;
        const recipientDeviceId = recipientKeyBundle.keyBundle.deviceId;

        // Store recipient info for later use
        setSelectedUserInfo({
          deviceId: recipientDeviceId,
          uid: recipientUid
        });

        // 2. Load messages directly from local IndexedDB - they should already be decrypted
        // and stored there by AppContext's message processing logic
        const localMessages = await getConversationMessages(recipientUid);
        console.log(`Loaded ${localMessages?.length || 0} messages from local storage`);
        
        if (localMessages && localMessages.length > 0) {
          // Format messages for display
          const formattedMessages = localMessages.map(msg => ({
            sender: msg.isOutgoing ? 'Me' : selectedUser,
            text: msg.text,
            time: msg.time,
            status: msg.status || 'sent'
          }));
          
          // Update both state objects
          setMessagesByUser(prev => ({
            ...prev,
            [selectedUser]: formattedMessages
          }));
          
          setMessages(formattedMessages);
        } else {
          // Clear messages when no local messages exist
          setMessagesByUser(prev => ({
            ...prev,
            [selectedUser]: []
          }));
          
          setMessages([]);
        }

        // 3. Check if we need to establish a session (still needed for sending messages)
        const sessionExists = await hasSession(userId, recipientUid, recipientDeviceId);
        
        if (!sessionExists) {
          console.log("No session, establishing new session");
          await establishSession(userId, recipientUid, recipientKeyBundle.keyBundle);
        }
        
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    
    if (view === 'chat' || view === 'friends') {
      loadChatHistory();
    }
  }, [selectedUser, view]);

  // Set up message listeners
  useEffect(() => {
    if (!socketReady) {
      console.log('Socket not ready, waiting to set up listeners');
      return;
    }

    console.log("socket ready, initing lisnters in Layout");
    // Handle incoming messages
    registerMessageListener((message) => {
      console.log("Received message via socket:", message);

      decryptMessage(message)
      .then(text => {
        console.log("decrypted text: ", text);

        const sender = message.sender;
        const time = message.time 
        
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
      })
      .catch(error => {
        console.error("Failed to decrypt message:", error);
      });
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
  }, [selectedUser, socketReady]);

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
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // For UI update
    const newMessage = {
      sender: 'Me',
      text,
      time: time,
    };
    
    setMessagesByUser(prev => {
      const userMessages = prev[selectedUser] || [];
      return {
        ...prev,
        [selectedUser]: [...userMessages, newMessage]
      };
    });
    
    // Update current messages view
    setMessages(prev => [...prev, newMessage]);
    
    // Clear typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      sendTypingStatus(selectedUser, false);
    }
    
    sendPrivateMessage(selectedUser, text, selectedUserInfo);
  };

  if (!appReady) {
    return (
      <div className="flex items-center justify-center h-screen"
        style={{
          backgroundColor: theme.colors.background.primary,
          color: theme.colors.text.primary
        }}>
        <h1 className="text-lg">Loading...</h1>
      </div>
    );
  }

  return (
    <div
     className="h-screen flex"
     style={{
      backgroundColor: theme.colors.background.primary,
      color: theme.colors.text.primary
     }}
    >
      {/* Navigation Bar */}
      <NavBar onProfileClick={() => setShowProfileModal(true)} setView={setView} />

      {/* Side Bar */}
      <div className="min-w-[250px] w-[25%] m-3 flex flex-col">
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
      <div 
        className="flex-1 flex flex-col shadow-lg rounded-lg m-3 ml-0"
        style={{backgroundColor: theme.colors.background.secondary}}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold">
            {selectedUser || 'Select a user to start chatting'}
            {selectedUser && view === 'archive' && ' (Archive)'}
            {selectedUser && isTyping[selectedUser] && 
              <span className="ml-2 text-sm text-gray-500 italic">typing...</span>
            }
          </h2>
        </div>
        <ChatWindow 
          messages={messages}
          selectedUser={selectedUser}
        />
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