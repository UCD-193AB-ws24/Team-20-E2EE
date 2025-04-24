import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFriendList } from '../api/friends';
import { getAvatar } from '../api/user';
import { loginUser } from '../api/auth';
import { darkTheme, lightTheme } from '../config/themes';
import getCurrentUser from '../util/getCurrentUser.js';
import { generateSignalProtocolKeys, createKeyBundle, getKeys } from '../util/encryption';
import { uploadKeyBundle } from '../api/keyBundle';
import { getDeviceId } from '../util/deviceId';
import { checkKeyBundle, checkDeviceKeyConsistency } from '../api/keyBundle';

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
    
    const setupKeys = async () => {
      try {
        // First check if this device needs a key bundle
        const deviceStatus = await checkKeyBundle();
        
        // If server says we need a key bundle
        if (deviceStatus.needsKeyBundle || currentUser.needsKeyBundle) {
          console.log('Generating new encryption keys for device');
          const keys = await generateSignalProtocolKeys(currentUser.uid);
          const keyBundle = createKeyBundle(keys);
          const result = await uploadKeyBundle(keyBundle);
          
          if (result.success) {
            console.log('Key bundle uploaded successfully');
            // Update user data in localStorage
            const user = getCurrentUser();
            if (user) {
              user.needsKeyBundle = false;
              localStorage.setItem('user', JSON.stringify(user));
            }
          } else {
            console.error('Failed to upload key bundle:', result.error);
          }
        } else {
          // Check if we have keys locally 
          const existingKeys = await getKeys(currentUser.uid);
          if (!existingKeys) {
            console.log('No local keys found, checking if keys exist on server for this device');
            
            // Make a dedicated API call to see if keys exist for this specific device
            const deviceKeyCheck = await checkDeviceKeyConsistency();
            
            if (deviceKeyCheck.hasKeysOnServer) {
              // Keys exist on server but not locally - inconsistent state!
              console.log('Keys exist on server but not locally - regenerating and re-uploading');
              const keys = await generateSignalProtocolKeys(currentUser.uid);
              const keyBundle = createKeyBundle(keys);
              await uploadKeyBundle(keyBundle, true); // true flag for overwriting existing keys
            } else {
              // No keys on server for this device
              console.log('No keys found on server for this device either, generating new key bundle');
              const keys = await generateSignalProtocolKeys(currentUser.uid);
              const keyBundle = createKeyBundle(keys);
              await uploadKeyBundle(keyBundle);
            }
          } else {
            console.log('Using existing local encryption keys');
          }
        }
      } catch (error) {
        console.error('Error in encryption setup:', error);
      }
    };
    
    setupKeys();
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