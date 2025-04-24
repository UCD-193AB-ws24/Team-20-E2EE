import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFriendList } from '../api/friends';
import { getAvatar } from '../api/user';
import { loginUser } from '../api/auth';
import { darkTheme, lightTheme } from '../config/themes';
import getCurrentUser from '../util/getCurrentUser.js';
import { generateSignalProtocolKeys, createKeyBundle, getKeys } from '../util/encryption';
import { uploadKeyBundle } from '../api/keyBundle';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [appReady, setAppReady] = useState(false);
  const [theme, setTheme] = useState(() => {
    // Check for system's theme preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return darkTheme;
    }
    return lightTheme;
  });

  // Check for an existing user on app load
  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  // Generate E2EE keys if needed after user logs in
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Check if key generation is needed
    if (currentUser.needsKeyBundle) {
      const setupEncryptionKeys = async () => {
        try {
          console.log('Generating new encryption keys');
          // Generate Signal Protocol keys for the user
          const keys = await generateSignalProtocolKeys(currentUser.uid);
          
          // Create key bundle with public keys only
          const keyBundle = createKeyBundle(keys);
          
          // Upload the key bundle to the server
          const result = await uploadKeyBundle(keyBundle);
          
          if (result.success) {
            console.log('Key bundle uploaded successfully');
            // Clear the needs key bundle flag
            const user = getCurrentUser();
            if (user) {
              user.needsKeyBundle = false;
              localStorage.setItem('user', JSON.stringify(user));
            }
          } else {
            console.error('Failed to upload key bundle:', result.error);
          }
        } catch (error) {
          console.error('Error setting up encryption keys:', error);
        }
      };

      setupEncryptionKeys();
    } else {
      // Check if we have keys locally
      const checkExistingKeys = async () => {
        try {
          const existingKeys = await getKeys(currentUser.uid);
          if (!existingKeys) {
            console.log('No local keys found, generating new keys');
            // Generate fresh keys since they're not found locally
            const keys = await generateSignalProtocolKeys(currentUser.uid);
            const keyBundle = createKeyBundle(keys);
            await uploadKeyBundle(keyBundle);
          } else {
            console.log('Using existing local encryption keys');
          }
        } catch (error) {
          console.error('Error checking existing keys:', error);
        }
      };
      
      checkExistingKeys();
    }
  }, [currentUser]);

  // Preload avatars after the user logs in
  useEffect(() => {
    if (!currentUser?.uid) return;

    const preloadAvatars = async () => {
      try {
        const response = await getFriendList(currentUser.idToken);
        const friends = response.friends || [];
        const usernames = [currentUser.username, ...friends.map((friend) => friend.username)];

        // Fetch and preload avatar images
        const avatarPromises = usernames.map(async (username) => {
          return await getAvatar(username);
        });

        await Promise.all(avatarPromises);
        setAppReady(true);
      } catch (error) {
        console.error('Error preloading avatars:', error);
      }
    };

    preloadAvatars();
  }, [currentUser]);

  // Login function to update the currentUser state
  const login = async (email, password) => {
    const result = await loginUser(email, password);
    if (result.success) {
      setCurrentUser(result.user);
    }
    return result;
  };

  return (
    <AppContext.Provider value={{ appReady, currentUser, login, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);