import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFriendList } from '../api/friends';
import { getAvatar } from '../api/user';
import { loginUser, getCurrentUser } from '../api/auth';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [avatarCache, setAvatarCache] = useState({});
  const [appReady, setAppReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for an existing user on app load
  useEffect(() => {
    const storedUser = getCurrentUser(); // Retrieve user from localStorage or session
    if (storedUser) {
      setCurrentUser(storedUser);
    }
    setLoading(false); // Mark loading as complete
  }, []);

  // Preload avatars after the user logs in
  useEffect(() => {
    if (!currentUser?.idToken) return;

    const preloadAvatars = async () => {
      try {
        const response = await getFriendList(currentUser.idToken);
        const friends = response.friends || [];
        const usernames = [currentUser.username, ...friends.map((friend) => friend.username)];

        // Fetch and preload avatar images as Blobs
        const avatarPromises = usernames.map(async (username) => {
          const avatarUrl = await getAvatar(username);
          const response = await fetch(avatarUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch avatar for ${username}`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          return { username, blobUrl };
        });

        const avatarResults = await Promise.all(avatarPromises);

        // Build the avatarCache
        const avatarMap = avatarResults.reduce((acc, { username, blobUrl }) => {
          acc[username] = blobUrl;
          return acc;
        }, {});

        setAvatarCache(avatarMap);
        setAppReady(true); // Mark the app as ready
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
      setCurrentUser(result.user); // Update the user state
    }
    return result; // Return the result to handle errors in the UI
  };

  if (loading) {
    return <div>Loading...</div>; // Show a loading state while checking for an existing user
  }

  return (
    <AppContext.Provider value={{ avatarCache, appReady, currentUser, login }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);