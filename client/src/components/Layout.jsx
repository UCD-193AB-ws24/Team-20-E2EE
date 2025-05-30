import React, { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from './NavBar';
import { ChatWindow, MessageInput, ProfileModal, ArchiveWindow, useSocket, EmptyChat } from './index';
import { Archive, Friends, Requests } from '../pages';
import {
  registerMessageListener, removeListener,
  sendTypingStatus, registerTypingListener
} from '../api/socket';
import getCurrentUser from '../util/getCurrentUser';
import { establishSession, hasSession } from '../util/encryption/sessionManager';
import { fetchKeyBundle } from '../api/keyBundle';
import { getConversationMessages, getGroupMessages, blurMessages } from '../util/messagesStore';
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
  const [refreshKey, setRefreshKey] = useState(0);
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
        console.log("Blurring messages");



        await blurMessages();

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
          console.log("Local messages: ", localMessages);
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
            status: msg.status || 'sent',
            timestamp: msg.timestamp,
            blur: msg.blur ?? false
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([]);
        }

      } catch (error) {
        console.error('Error loading chat messages:', error);
        setMessages([]);
      }
    };

    if (selectedUser && (view === 'chat' || view === 'friends' || view === 'archive')) {
      loadChatHistory();
    }
  }, [selectedUser, view, refreshKey]);

  useEffect(() => {
    const interval = setInterval(async () => {

      const now = Date.now();

      await blurMessages();

      setMessages(prevMessages => {
        let blurCount = 0;

        const updated = prevMessages.map((msg, index) => {
          const msgTime = new Date(msg.timestamp).getTime();
          const isExpired = msgTime < now - 30 * 1000;

          if (!msg.blur && isExpired) {
            blurCount++;
            return { ...msg, blur: true };
          }
          return msg;
        });

        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);



  // useEffect(() => {
  //   const loadChatArchive = async () => {
  //     if (!selectedUser) return;
  //     if (!user) return;

  //     const chatId = buildChatId(userId, selectedUserInfo.uid);

  //     try {
  //       const { messages: archivedMessages } = await getArchivedChatHistory(chatId);

  //       const formattedMessages = archivedMessages.map(msg => ({
  //         sender: msg.senderUid === userId ? 'Me' : msg.senderUid,
  //         text: msg.text,
  //         time: new Date(msg.timestamp).toLocaleTimeString([], {
  //           hour: '2-digit',
  //           minute: '2-digit',
  //         }),
  //       }));

  //       console.log("messages: ", formattedMessages);

  //       setArchivedMessages(formattedMessages || []);
  //     } catch (err) {
  //       console.error("Error fetching archived chat history:", err);
  //     }
  //   };

  //   loadChatArchive();
  // }, [selectedUserInfo.uid]);

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

    const timestamp = new Date().toISOString();

    const newMessage = {
      sender: 'Me',
      text,
      time,
      timestamp,
      blur: false
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
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}
