import React, { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal, ArchiveWindow, useSocket } from './index';
import { Archive, Friends, Requests } from '../pages';
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

export default function Layout({ children }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [archivedMessages, setArchivedMessages] = useState([]);
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

  // Vanish feature: Deprecated for testing purposes

  // useEffect(() => {
  //   const user = JSON.parse(localStorage.getItem('user'));
  //   if (!user?.accessToken) {
  //     setTimeout(() => {
  //       const delayedUser = JSON.parse(localStorage.getItem("user"));
  //       if (delayedUser?.accessToken) {
  //         setSelectedUser((prev) => prev); // trigger re-run
  //       }
  //     }, 300);
  //     return;
  //   }

  //   const shouldDelete =
  //     hasMounted.current &&
  //     prevSelectedUser.current !== null &&
  //     identifyChatType(selectedUser) !== identifyChatType(prevSelectedUser.current);

  //   const deleteMessages = async () => {
  //     if (shouldDelete) {
  //       try {
  //         const res = await fetch(`${BACKEND_URL}/api/message/vanish`, {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //             'Authorization': `Bearer ${user.accessToken}`
  //           },
  //           body: JSON.stringify({
  //             username: identifyChatType(prevSelectedUser.current),
  //           })
  //         });

  //         const result = await res.json();
  //         console.log(`Archived messages with ${prevSelectedUser.current}:`, result);
  //       } catch (err) {
  //         console.error('Error archiving messages:', err);
  //       }
  //     }

  //     prevSelectedUser.current = selectedUser;
  //     hasMounted.current = true;
  //   };

  //   deleteMessages();
  // }, [selectedUser]);

  // useEffect(() => {
  //   const user = JSON.parse(localStorage.getItem('user'));

  //   const handleBeforeUnload = async (event) => {
  //     if (user?.accessToken && selectedUser) {
  //       navigator.sendBeacon(
  //         `${BACKEND_URL}/api/message/vanish`,
  //         JSON.stringify({
  //           username: identifyChatType(),
  //         })
  //       );
  //     }
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [selectedUser]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedUser) return;
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

    registerMessageListener((message) => {
      decryptMessage(message)
        .then(text => {
          const sender = message.sender;
          const time = message.time;
          const metadata = message.metadata || {};

          if (!selectedUser) {
            console.log('Message received but no user selected, ignoring');
            return; // Skip processing if no user is selected
          }

          // Check if this is a direct message or group message
          if (metadata && metadata.isGroupMessage && typeof selectedUser === 'object' && selectedUser.type === 'group') {
            // For group messages, check if this message belongs to the currently selected group
            if (metadata.groupId === selectedUser.id) {
              setMessages(prev => [...prev, { sender, text, time }]);
            }
          }
          // For direct messages, check if sender matches selected user
          else if (typeof selectedUser === 'string' && sender === selectedUser) {
            setMessages(prev => [...prev, { sender, text, time }]);
          }
        })
        .catch(error => {
          console.error("Failed to decrypt message:", error);
        });
    });

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
      <NavBar onProfileClick={() => setShowProfileModal(true)} setView={setView} />

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
            {selectedKey || 'Select a user to start chatting'}
            {selectedUser && view === 'archive' && ' (Archive)'}
            {selectedUser && isTyping[selectedKey] &&
              <span className="ml-2 text-sm text-gray-500 italic">typing...</span>
            }
          </h2>
        </div>
        {view === 'archive' ? (
          <ArchiveWindow
            messages={archivedMessages}
            selectedUser={selectedUser || ""}
            selectedUserID={selectedUserInfo.uid || ""}
          />
        ) : (
          <ChatWindow
            messages={messages}
            selectedUser={selectedUser || ""}
            selectedUserID={selectedUserInfo.uid || ""}
          />
        )}
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
