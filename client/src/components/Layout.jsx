import React, { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal, ArchiveWindow, useSocket, EmptyChat } from './index';
import { Archive, Friends, Requests, Profile, PasskeyManagement } from '../pages';
import {
  registerMessageListener, removeListener,
  sendTypingStatus, registerTypingListener
} from '../api/socket';
import getCurrentUser from '../util/getCurrentUser';
import { establishSession, hasSession } from '../util/encryption/sessionManager';
import { fetchKeyBundle } from '../api/keyBundle';
import { getConversationMessages, getGroupMessages } from '../util/messagesStore';
import { getChatHistory, getGroupHistory, getArchivedChatHistory, sendPrivateMessage, sendGroupMessage, decryptMessage, buildChatId } from '../api/messages';
import { useAppContext } from './AppContext';
import { BACKEND_URL } from '../config/config';
import LoadingEffect from './LoadingEffect';
import { getDeviceId } from '../util/deviceId.js';

export default function Layout({ children }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [archivedMessages, setArchivedMessages] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasskeyManagement, setShowPasskeyManagement] = useState(false);
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
  }, []);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedUser) {
        setMessages([]); // Clear messages when no user selected
        return;
      }
    
      setMessages([]);
      
      console.log(selectedUser)

      let localMessages = [];

      try {
        // if private user
        if (typeof selectedUser === 'string') {
          const recipientKeyBundle = await fetchKeyBundle(selectedUser);
          const recipientUid = recipientKeyBundle.keyBundle.uid;
          const recipientDeviceId = recipientKeyBundle.keyBundle.deviceId;

          setSelectedUserInfo({
            deviceId: recipientDeviceId,
            uid: recipientUid
          });

          const sessionExists = await hasSession(userId, recipientUid, recipientDeviceId);
          if (!sessionExists) {
            console.log("No session, establishing new session");
            await establishSession(userId, recipientUid, recipientKeyBundle.keyBundle);
          }

          const metadata = { isGroup: false, groupdId: null }

          localMessages = await getConversationMessages(recipientUid, metadata);
        } // group chat
        else if (typeof selectedUser === 'object' && selectedUser.type === 'group') {
          setSelectedUserInfo({
            deviceId: null,
            uid: null
          });

          localMessages = await getGroupMessages(selectedUser.id);
        }

        console.log(`Loaded ${localMessages?.length || 0} messages from local storage`);

        if (localMessages && localMessages.length > 0) {
          const formattedMessages = localMessages.map(msg => ({
            sender: msg.isOutgoing ? 'Me' : msg.senderId,
            text: msg.text,
            time: msg.time,
            status: msg.status || 'sent'
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([]);
        }

      } catch (error) {
        console.error('Error loading chat messages:', error);
        setMessages([]); // Clear messages on error
      }
    };

    if (selectedUser && (view === 'chat' || view === 'friends' || view === 'archive')) {
      loadChatHistory();
    }
  }, [selectedUser, view]);

  useEffect(() => {
    const loadChatArchive = async () => {
      if (!selectedUser) return;
      if (!user) return;

      const chatId = buildChatId(userId, selectedUserInfo.uid);

      try {
        const { messages: archivedMessages } = await getArchivedChatHistory(chatId);

        const formattedMessages = archivedMessages.map(msg => ({
          sender: msg.senderUid === userId ? 'Me' : msg.senderUid,
          text: msg.text,
          time: new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

        console.log("messages: ", formattedMessages);

        setArchivedMessages(formattedMessages || []);
      } catch (err) {
        console.error("Error fetching archived chat history:", err);
      }
    };

    loadChatArchive();
  }, [selectedUserInfo.uid]);

  useEffect(() => {
    if (!socketReady) {
      console.log('Socket not ready, waiting to set up listeners');
      return;
    }

    registerMessageListener(handleReceiveMessage);

    registerTypingListener((data) => {
      const { username, isTyping: typing } = data;
      setIsTyping(prev => ({
        ...prev,
        [username]: typing
      }));

      if (typing) {
        setTimeout(() => {
          setIsTyping(prev => ({
            ...prev,
            [username]: false
          }));
        }, 3000);
      }
    });

    return () => {
      removeListener('receive_message');
      removeListener('message_sent');
      removeListener('user_typing');
    };
  }, [selectedUser, socketReady]);

  const handleTyping = useCallback(() => {
    if (!selectedUser) return;
    if (typingTimeout) clearTimeout(typingTimeout);

    sendTypingStatus(identifyChatType(), true);

    const timeout = setTimeout(() => {
      sendTypingStatus(identifyChatType(), false);
    }, 3000);

    setTypingTimeout(timeout);
  }, [selectedUser, typingTimeout]);

  const sendMessage = async (text) => {
    if (!selectedUser || !text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage = {
      sender: 'Me',
      text,
      time,
    };

    setMessages(prev => [...prev, newMessage]);

    if (typeof selectedUser === 'string') {
      const metadata =
      {
        isGroupMessage: false,
        groupId: null,
      }
      sendPrivateMessage(selectedUser, text, selectedUserInfo, metadata);
    } else if (typeof selectedUser === 'object' && selectedUser.type === 'group') {
      await sendGroupMessage(selectedUser.id, text, selectedUser.members);
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      sendTypingStatus(identifyChatType(), false);
    }
  };

  const handleManagePasskeys = () => {
    setShowPasskeyManagement(true);
    setShowProfileModal(false);
  };

  const handleSelectUser = async (selectedUserId) => {
    try {
      setSelectedUser(selectedUserId);
      
      // Don't establish session preemptively - let the first message do it
      console.log(`Selected user ${selectedUserId}, waiting for messages to establish session`);
      
      // Just fetch the key bundle for caching purposes
      const username = usernames[selectedUserId];
      if (username) {
        try {
          console.log(`Fetching key bundle for ${username} for caching`);
          const keyBundleResult = await fetchKeyBundle(username);
          if (keyBundleResult.success) {
            console.log(`Successfully cached key bundle for ${username}`);
          }
        } catch (error) {
          console.warn(`Failed to fetch key bundle for ${username}:`, error);
        }
      }
      
      // Load existing messages
      const messages = await getMessagesFromConversation(user.uid, selectedUserId);
      console.log("Loaded messages from local storage", messages);
      setMessages(messages);
    } catch (error) {
      console.error("Error selecting user:", error);
    }
  };

  const handleReceiveMessage = async (data) => {
    try {
      console.log('Received encrypted message:', data);
      
      const {
        _id,
        senderUid,
        sender: senderUsername,
        senderDeviceId,
        recipientDeviceId,
        encryptedMessage,
        time,
        timestamp,
        metadata
      } = data;

      // Device filtering at socket level
      const currentDeviceId = getDeviceId();
      if (recipientDeviceId && recipientDeviceId !== currentDeviceId) {
        console.log(`Message for device ${recipientDeviceId}, but we are ${currentDeviceId}. Ignoring.`);
        return;
      }

      try {
        // Pass complete message data including recipientDeviceId
        const decryptedText = await decryptMessage({
          _id,
          senderUid,
          senderDeviceId,
          recipientDeviceId,
          encryptedMessage,
          time,
          timestamp,
          metadata
        });

        // Check if message was filtered out (null return)
        if (decryptedText === null) {
          console.log('Message filtered out - not for this device');
          return; // Exit early, don't update UI
        }

        if (!selectedUser) {
          console.log('Message received but no user selected, ignoring');
          return; // Skip processing if no user is selected
        }

        // Handle group messages
        if (metadata && metadata.isGroupMessage && typeof selectedUser === 'object' && selectedUser.type === 'group') {
          // For group messages, check if this message belongs to the currently selected group
          if (metadata.groupId === selectedUser.id) {
            const groupMessage = {
              sender: senderUsername,
              text: decryptedText,
              time: time
            };
            setMessages(prev => [...prev, groupMessage]);
          }
        }
        // Handle direct messages
        else if (typeof selectedUser === 'string' && senderUsername === selectedUser) {
          const directMessage = {
            sender: senderUsername,
            text: decryptedText,
            time: time
          };
          setMessages(prev => [...prev, directMessage]);
        }

        console.log(`Successfully decrypted and processed message from ${senderUsername}:${senderDeviceId}`);

      } catch (decryptError) {
        console.error('Failed to decrypt message:', decryptError);
        
        // Only show error message if it's for the currently selected conversation
        const shouldShowError = (
          (metadata && metadata.isGroupMessage && typeof selectedUser === 'object' && selectedUser.type === 'group' && metadata.groupId === selectedUser.id) ||
          (typeof selectedUser === 'string' && senderUsername === selectedUser)
        );

        if (shouldShowError) {
          const errorMessage = {
            sender: senderUsername,
            text: `[Failed to decrypt message]`,
            time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            error: true
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('Error in handleReceiveMessage:', error);
    }
  };

  if (!appReady) {
    return (
      <div className="flex items-center justify-center h-screen"
        style={{
          backgroundColor: theme.colors.background.primary,
          color: theme.colors.text.primary
        }}>
        <LoadingEffect />
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
      <NavBar onProfileClick={() => {
        setShowProfileModal(true);
        setShowPasskeyManagement(false);
      }} setView={setView} />

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
            isTyping
          })
        )}
      </div>

      <div
        className="flex-1 flex flex-col shadow-lg rounded-lg m-3 ml-0"
        style={{ backgroundColor: theme.colors.background.secondary }}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold">
            {selectedKey}
            {selectedUser && view === 'archive' && ' (Archive)'}
            {selectedUser && isTyping[selectedKey] &&
              <span className="ml-2 text-sm text-gray-500 italic">typing...</span>
            }
          </h2>
        </div>
        {!selectedUser ? (
          <EmptyChat />
        ) : view === 'archive' ? (
          <ArchiveWindow
            messages={archivedMessages}
            selectedUser={selectedUser || ""}
            selectedUserID={selectedUserInfo.uid || ""}
          />
        ) : (
          <>
            <ChatWindow
              messages={messages}
              selectedUser={selectedUser || ""}
              selectedUserID={selectedUserInfo.uid || ""}
            />
            <MessageInput
              sendMessage={sendMessage}
              onTyping={handleTyping}
              disabled={!selectedUser}
            />
          </>
        )}
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => {
          setShowProfileModal(false);
          setShowPasskeyManagement(false);
        }} onManagePasskeys={handleManagePasskeys} />
      )}

      {showPasskeyManagement && (
        <PasskeyManagement 
          onClose={() => {
            setShowPasskeyManagement(false);
            setShowProfileModal(false);
          }}
          onBack={() => {
            setShowPasskeyManagement(false);
            setShowProfileModal(true);
          }}
        />
      )}
    </div>
  );
}
