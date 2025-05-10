import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFriendList } from '../api/friends';
import { getAvatar } from '../api/user';
import { loginUser } from '../api/auth';
import { darkTheme, lightTheme } from '../config/themes';
import getCurrentUser from '../util/getCurrentUser.js';
import { generateSignalProtocolKeys, createKeyBundle, getKeys } from '../util/encryption';
import { uploadKeyBundle } from '../api/keyBundle';
import { checkKeyBundle, checkDeviceKeyConsistency } from '../api/keyBundle';
import { getChatHistory, decryptMessage } from '../api/messages';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [appReady, setAppReady] = useState(false);
  
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [messagesFetched, setMessagesFetched] = useState(false);
  const [avatarsLoaded, setAvatarsLoaded] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadBySender, setUnreadBySender] = useState({});
  const [decryptedMessages, setDecryptedMessages] = useState({});
  
  const [theme, setTheme] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return darkTheme;
    }
    return lightTheme;
  });

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const setupKeys = async () => {
      try {
        const deviceStatus = await checkKeyBundle();
        
        if (deviceStatus.needsKeyBundle || currentUser.needsKeyBundle) {
          console.log('Generating new encryption keys for device');
          const keys = await generateSignalProtocolKeys(currentUser.uid);
          const keyBundle = createKeyBundle(keys);
          const result = await uploadKeyBundle(keyBundle);
          
          if (result.success) {
            console.log('Key bundle uploaded successfully');
            const user = getCurrentUser();
            if (user) {
              user.needsKeyBundle = false;
              localStorage.setItem('user', JSON.stringify(user));
            }
          } else {
            console.error('Failed to upload key bundle:', result.error);
          }
        } else {
          const existingKeys = await getKeys(currentUser.uid);
          if (!existingKeys) {
            console.log('No local keys found, checking if keys exist on server for this device');
            
            const deviceKeyCheck = await checkDeviceKeyConsistency();
            
            if (deviceKeyCheck.hasKeysOnServer) {
              console.log('Keys exist on server but not locally - regenerating and re-uploading');
              const keys = await generateSignalProtocolKeys(currentUser.uid);
              const keyBundle = createKeyBundle(keys);
              await uploadKeyBundle(keyBundle, true);
            } else {
              console.log('No keys found on server for this device either, generating new key bundle');
              const keys = await generateSignalProtocolKeys(currentUser.uid);
              const keyBundle = createKeyBundle(keys);
              await uploadKeyBundle(keyBundle);
            }
          } else {
            console.log('Using existing local encryption keys');
          }
        }
        
        setEncryptionReady(true);
      } catch (error) {
        console.error('Error in encryption setup:', error);
        setEncryptionReady(true);
      }
    };
    
    setupKeys();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid || !encryptionReady || messagesFetched) return;
    
    const fetchMessages = async () => {
      try {
        console.log('Fetching and decrypting all unread messages on app startup...');
        
        // Step 1: Fetch all unread messages
        const { messages } = await getChatHistory();
        console.log(`Fetched ${messages?.length || 0} unread messages`);
        
        if (messages && messages.length > 0) {
          // Count unread messages by sender for badge display
          const countByUsername = {};
          const decryptedMessagesByUsername = {};
          
          // Step 2: Process and decrypt messages in batches
          const processedMessages = [];
          
          for (const msg of messages) {
            const username = msg.sender !== 'Me' ? msg.sender : msg.recipientUsername;
            countByUsername[username] = (countByUsername[username] || 0) + 1;
            
            try {
              // Group messages by sender for session management
              if (!decryptedMessagesByUsername[username]) {
                decryptedMessagesByUsername[username] = [];
              }
              
              // Only decrypt if the message is encrypted
              if (msg.encryptedMessage) {
                // Decrypt the message
                const decryptedText = await decryptMessage(msg);
                
                // Create processed message object
                const processedMsg = {
                  ...msg,
                  text: decryptedText,
                  decrypted: true,
                  timestamp: new Date(msg.timestamp || Date.now())
                };
                
                // Add to both collections
                decryptedMessagesByUsername[username].push(processedMsg);
                processedMessages.push(processedMsg);
              } else {
                // Non-encrypted message handling if needed
                decryptedMessagesByUsername[username].push(msg);
                processedMessages.push(msg);
              }
            } catch (error) {
              console.warn(`Failed to decrypt message from ${username}:`, error);
              // Add to UI with error indicator
              const errorMsg = {
                ...msg,
                text: "⚠️ Could not decrypt this message",
                decryptionFailed: true
              };
              
              decryptedMessagesByUsername[username].push(errorMsg);
              processedMessages.push(errorMsg);
            }
          }
          
          setDecryptedMessages(decryptedMessagesByUsername);
          
          console.log(`Successfully processed ${processedMessages.length} messages`);
        }
        
        setMessagesFetched(true);
      } catch (error) {
        console.error('Error fetching and decrypting messages:', error);
        setMessagesFetched(true);
      }
    };
    
    fetchMessages();
  }, [currentUser, encryptionReady, messagesFetched]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const preloadAvatars = async () => {
      try {
        console.log('Preloading avatars for user and friends');
        
        const response = await getFriendList(currentUser.idToken);
        const friends = response.friends || [];
        const usernames = [currentUser.username, ...friends.map((friend) => friend.username)];

        const avatarPromises = usernames.map(async (username) => {
          return await getAvatar(username);
        });

        await Promise.all(avatarPromises);
        console.log('Successfully preloaded all avatars');
        setAvatarsLoaded(true);
      } catch (error) {
        console.error('Error preloading avatars:', error);
        setAvatarsLoaded(true);
      }
    };

    preloadAvatars();
  }, [currentUser, messagesFetched]);

  useEffect(() => {
    if (encryptionReady && messagesFetched && avatarsLoaded) {
      console.log('App initialization completed, ready state reached');
      setAppReady(true);
    }
  }, [encryptionReady, messagesFetched, avatarsLoaded]);

  const login = async (email, password) => {
    const result = await loginUser(email, password);
    if (result.success) {
      setCurrentUser(result.user);
      setEncryptionReady(false);
      setMessagesFetched(false);
      setAvatarsLoaded(false);
      setAppReady(false);
    }
    return result;
  };
  
  const logout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setEncryptionReady(false);
    setMessagesFetched(false);
    setAvatarsLoaded(false);
    setAppReady(false);
    setUnreadMessageCount(0);
    setUnreadBySender({});
  };
  
  const markSenderMessagesAsRead = (sender) => {
    if (unreadBySender[sender]) {
      setUnreadMessageCount(prev => prev - unreadBySender[sender]);
      setUnreadBySender(prev => {
        const updated = { ...prev };
        delete updated[sender];
        return updated;
      });
    }
  };

  return (
    <AppContext.Provider 
      value={{ 
        appReady, 
        currentUser, 
        login,
        logout,
        theme, 
        setTheme,
        unreadMessageCount,
        unreadBySender,
        markSenderMessagesAsRead,
        decryptedMessages,
        initStatus: {
          encryptionReady,
          messagesFetched,
          avatarsLoaded
        }
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);