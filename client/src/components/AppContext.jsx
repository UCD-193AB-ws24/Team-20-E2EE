import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAvatar } from '../api/user';
import { getFriendList } from '../api/friends';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [avatarCache, setAvatarCache] = useState({}); 
  const [loadingAvatars, setLoadingAvatars] = useState(true); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [appReady, setAppReady] = useState(false); 

  useEffect(() => {
    const preloadAvatars = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          setCurrentUser(user);
  
          // Fetch the friend list
          const response = await getFriendList(user.idToken);
  
          // Extract usernames from the friends array
          const friends = response.friends || [];
          const usernames = [user.username, ...friends.map((friend) => friend.username)];
  
          // Fetch and preload avatar images as Blobs
          const avatarPromises = usernames.map(async (username) => {
            const avatarUrl = await getAvatar(username); // Get the avatar URL
            const response = await fetch(avatarUrl); // Fetch the image data
            if (!response.ok) {
              throw new Error(`Failed to fetch avatar for ${username}`);
            }
            const blob = await response.blob(); // Convert to Blob
            const blobUrl = URL.createObjectURL(blob); // Create a Blob URL
            return { username, blobUrl };
          });
  
          const avatarResults = await Promise.all(avatarPromises);
  
          const avatarMap = avatarResults.reduce((acc, { username, blobUrl }) => {
            acc[username] = blobUrl; // Store the Blob URL
            return acc;
          }, {});
  
          console.log('avatarmap', avatarMap);
  
          setAvatarCache(avatarMap);
        }
      } catch (error) {
        console.error('Error preloading avatars:', error);
      } finally {
        setLoadingAvatars(false);
      }
    };
  
    preloadAvatars();
    console.log('avatars fetched');
  }, []);

  useEffect(() => {
    if (!loadingAvatars) {
        setAppReady(true);
    }
  }, [loadingAvatars]);

  return (
    <AppContext.Provider value={{ avatarCache, appReady, currentUser }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);