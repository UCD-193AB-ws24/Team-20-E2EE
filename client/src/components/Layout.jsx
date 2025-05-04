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
import { getConversationMessages } from '../util/messagesStore';
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

        // 2. Load messages from local IndexedDB
        const localMessages = await getConversationMessages(recipientUid);
        console.log('local Messages:', localMessages);
        if (localMessages && localMessages.length > 0) {
          console.log(`Loaded ${localMessages.length} messages from local storage`);
          
          // Set the local messages in state for immediate display
          const formattedLocalMessages = localMessages.map(msg => ({
            sender: msg.isOutgoing ? 'Me' : selectedUser,
            text: msg.text,
            time: msg.formattedTime
          }));
          
          setMessagesByUser(prev => ({
            ...prev,
            [selectedUser]: formattedLocalMessages
          }));
          
          setMessages(formattedLocalMessages);
        }

        // 3. Check if we need to establish a session
        const sessionExists = await hasSession(userId, recipientUid, recipientDeviceId);
        console.log("Existing session found:", sessionExists);
        
        if (!sessionExists) {
          console.log("No session, establishing new session");
          await establishSession(userId, recipientUid, recipientKeyBundle.keyBundle);
        }
        
        // 4. Fetch only unread messages from the server
        const { messages: unreadMessages } = await getChatHistory(selectedUser, true);
        console.log(`Fetched ${unreadMessages?.length || 0} unread messages from server`);
                
        // 5. Decrypt and store new messages if any
        if (unreadMessages && unreadMessages.length > 0) {
          console.log("Beginning message decryption process for new messages");
          
          // Sort messages by time to ensure oldest first
          const sortedMessages = [...unreadMessages].sort((a, b) => 
            new Date(a.time) - new Date(b.time)
          );
          
          const newDecryptedMessages = [];
          
          for (let msg of sortedMessages) {
            if (msg.encryptedMessage) {
              try {
                // The decryptMessage function now stores messages in IndexedDB
                const decryptedText = await decryptMessage(msg);
                
                newDecryptedMessages.push({
                  ...msg,
                  text: decryptedText,
                  decrypted: true
                });
              } catch (error) {
                console.warn(`Failed to decrypt message: ${error.message}`);
                newDecryptedMessages.push({
                  ...msg,
                  text: "⚠️ Could not decrypt this message",
                  decryptionFailed: true
                });
              }
            } else {
              newDecryptedMessages.push(msg);
            }
          }
          
          // 6. If we have new messages, append them to local storage
          if (newDecryptedMessages.length > 0) {
            setMessagesByUser(prev => {
              const existingMessages = prev[selectedUser] || [];
              
              const allMessages = [...existingMessages, ...newDecryptedMessages];
              
              // sort by time
              const sortedMessages = allMessages.sort((a, b) => 
                new Date(a.time) - new Date(b.time)
              );
              
              return {
                ...prev,
                [selectedUser]: sortedMessages
              };
            });
            
            // Update current messages view 
            setMessages(prev => {
              const allMessages = [...prev, ...newDecryptedMessages];
              
              return allMessages;
            });
          }
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
    // Handle incoming messages
    registerMessageListener((message) => {
      decryptMessage(message)
      .then(text => {
        console.log("decrypted text: ", text);

        const sender = message.sender;
        const time = message.time;
        
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
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // For UI update
    const newMessage = {
      sender: 'Me',
      text,
      time: timestamp,
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
    
    // Now send the message in the background
    try {
      // Send the message and get the result
      const result = await sendPrivateMessage(selectedUser, text, selectedUserInfo);
      
      if (!result.success) {        
        console.error("Failed to send message:", result?.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error in send message function:", error);
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