import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFriendList } from '../api/friends';
import { getAvatar } from '../api/user';
import { loginUser, getCurrentUser } from '../api/auth';
import { lightTheme } from '../config/themes';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [appReady, setAppReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(lightTheme);

  // Check for an existing user on app load
  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
    setLoading(false);
  }, []);

  // Preload avatars after the user logs in
  useEffect(() => {
    if (!currentUser?.idToken) return;

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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AppContext.Provider value={{ appReady, currentUser, login, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);