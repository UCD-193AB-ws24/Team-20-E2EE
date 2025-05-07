import React, { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal, useSocket } from './index';
import { Archive, Friends, Requests } from '../pages';
import {
  registerMessageListener, registerMessageSentListener,
  removeListener, sendTypingStatus, registerTypingListener
} from '../api/socket';
import { getChatHistory, getGroupHistory, sendPrivateMessage, sendGroupMessage } from '../api/messages';
import { useAppContext } from './AppContext';
import { BACKEND_URL } from '../config/config';


// Initialize with empty data structure
const initialMessagesState = {};

export default function Layout({ children }) {

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesByUser, setMessagesByUser] = useState(initialMessagesState);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [view, setView] = useState();
  const [isTyping, setIsTyping] = useState({});
  const [typingTimeout, setTypingTimeout] = useState(null);
  const { socketReady } = useSocket();
  const { appReady, theme } = useAppContext();
  const prevSelectedUser = useRef(null);
  const hasMounted = useRef(false);

  const identifyChatType = (user = selectedUser) =>
    typeof user === 'string' ? user : user?.name;

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

  useEffect(() => {
    console.log("useEffect triggered for selectedUser");

    const user = JSON.parse(localStorage.getItem('user'));
    console.log("Loaded user from localStorage:", user);

    if (!user?.accessToken) {
      setTimeout(() => {
        console.log("No accessToken");
        const delayedUser = JSON.parse(localStorage.getItem("user"));
        if (delayedUser?.accessToken) {
          console.log("No accessToken for delayed user");
          setSelectedUser((prev) => prev); // trigger re-run
        }
      }, 300);
      return;
    }

    console.log("accessToken:", user.accessToken);

    const shouldDelete =
      hasMounted.current &&
      prevSelectedUser.current !== null &&
      identifyChatType(selectedUser) !== identifyChatType(prevSelectedUser.current);

    console.log("hasMounted:", hasMounted.current);
    console.log("prevSelectedUser:", prevSelectedUser.current);
    console.log("selectedUser:", selectedUser);
    console.log("shouldDelete:", shouldDelete);

    const deleteMessages = async () => {
      if (shouldDelete) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/message/vanish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.accessToken}`
            },
            body: JSON.stringify({
              username: identifyChatType(prevSelectedUser.current),
            })
          });

          const result = await res.json();
          console.log(`Archived messages with ${prevSelectedUser.current}:`, result);
        } catch (err) {
          console.error('Error archiving messages:', err);
        }
      }

      prevSelectedUser.current = selectedUser;
      hasMounted.current = true;
    };

    deleteMessages();
  }, [selectedUser]);


  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));

    const handleBeforeUnload = async (event) => {
      if (user?.accessToken && selectedUser) {
        navigator.sendBeacon(
          `${BACKEND_URL}/api/message/vanish`,
          JSON.stringify({
            username: identifyChatType(),
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedUser]);

  // Load chat history when selected user changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedUser) return;

      try {
        const user = JSON.parse(localStorage.getItem('user'));

        // Always fetch the chat history from the server when a user is selected
        let chatHistory = [];

        if (typeof selectedUser === 'object' && selectedUser.type === 'group') {
          console.log("Loading group chat history");
          const result = await getGroupHistory(selectedUser.id);
          chatHistory = result.messages || [];
        } else {
          const result = await getChatHistory(user.accessToken, selectedUser);
          chatHistory = result.messages || [];
        }

        setMessagesByUser((prev) => ({
          ...prev,
          [identifyChatType()]: chatHistory || [],
        }));
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
    console.log('Socket is ready, setting up listeners');
    // Handle incoming messages
    registerMessageListener((message) => {
      console.log("Received message:", message);
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
      if (sender === identifyChatType()) {
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
      if (recipient === identifyChatType()) {
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
    sendTypingStatus(identifyChatType(), true);

    // Set timeout to stop typing indicator
    const timeout = setTimeout(() => {
      sendTypingStatus(identifyChatType(), false);
    }, 3000);

    setTypingTimeout(timeout);
  }, [selectedUser, typingTimeout]);

  // Send message function
  const sendMessage = async (text) => {
    if (!selectedUser || !text.trim()) return;
    if (typeof selectedUser === 'string') {
      console.log("Private message");
      await sendPrivateMessage(selectedUser, text);
    } else if (typeof selectedUser == 'object' && selectedUser.type === 'group') {
      console.log("Group message");
      await sendGroupMessage(selectedUser.id, text);
    }

    // Clear typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      sendTypingStatus(identifyChatType(), false);
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

  const selectedKey = identifyChatType();

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
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold">
            {selectedKey || 'Select a user to start chatting'}
            {selectedUser && view === 'archive' && ' (Archive)'}
            {selectedUser && isTyping[selectedKey] &&
              <span className="ml-2 text-sm text-gray-500 italic">typing...</span>
            }
          </h2>
        </div>
        <ChatWindow
          messages={messagesByUser[selectedKey] || []}
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