import React, { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal, useSocket } from './index';
import { Archive, Friends, Requests } from '../pages';
import { 
  registerMessageListener, registerMessageSentListener,
  removeListener, sendTypingStatus, registerTypingListener
} from '../api/socket';
import { getChatHistory, sendPrivateMessage, decryptMessage} from '../api/messages';
import { useAppContext } from './AppContext';
import getCurrentUser from '../util/getCurrentUser';
import {establishSession, hasSession} from '../util/encryption/sessionManager';
import {fetchKeyBundle} from '../api/keyBundle';
import {getFriendIdByUsername} from '../api/friends';


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
        const recipientKeyBundle = await fetchKeyBundle(selectedUser);
        const recipientUid = recipientKeyBundle.keyBundle.uid;
        const recipientDeviceId = recipientKeyBundle.keyBundle.deviceId;

        // Always fetch the chat history from the server when a user is selected
        const { messages: chatHistory } = await getChatHistory(selectedUser);

        console.log("Recipient Key Bundle:", recipientKeyBundle.keyBundle);

        const sessionExist = await hasSession(userId, recipientUid, recipientDeviceId);
        console.log(sessionExist);

        if (!sessionExist) {
          const response = await establishSession(userId, recipientKeyBundle.keyBundle.uid, recipientKeyBundle.keyBundle);
          console.log("Response from establishSession:", response);        
        }

        console.log("Selected User DID:", recipientKeyBundle.keyBundle.deviceId);
        console.log("Selected User ID:", recipientKeyBundle.keyBundle.uid);

        setSelectedUserInfo({
          deviceId: recipientKeyBundle.keyBundle.deviceId,
          uid: recipientKeyBundle.keyBundle.uid
        });

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
    // Handle incoming messages
    registerMessageListener((message) => {
      const { sender, encryptedMessage, time, senderUid, senderDeviceId } = message;

      console.log("message received: ", message);

      console.log("encrypted text: ", encryptedMessage.body);

      console.log("sender id: ", senderUid);

      decryptMessage(encryptedMessage, senderUid, senderDeviceId)
      .then(text => {
        console.log("decrypted text: ", text);
        
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
    
    sendPrivateMessage(selectedUser, text, selectedUserInfo);
    
    // Clear typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      sendTypingStatus(selectedUser, false);
    }
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