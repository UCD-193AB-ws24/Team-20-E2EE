import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeSocket, disconnectSocket, isSocketConnected } from '../api/socket';

// Create the context
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socketReady, setSocketReady] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [pendingListeners, setPendingListeners] = useState([]);
  
  // Initialize socket when the provider mounts
  useEffect(() => {
    console.log('SocketProvider initializing');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user?.idToken) {
      try {
        // Initialize the socket connection
        console.log('Initializing socket from context');
        initializeSocket(user.idToken, {
          onConnect: () => {
            console.log('Socket connected successfully');
            setSocketReady(true);
            setSocketError(null);
          },
          onError: (err) => {
            console.error('Socket connection error:', err);
            setSocketError(err.message || 'Failed to connect to server');
            setSocketReady(false);
          },
          onDisconnect: (reason) => {
            console.log('Socket disconnected:', reason);
            setSocketReady(false);
          }
        });
        
        // Check connection status after a moment
        const checkTimer = setTimeout(() => {
          const connected = isSocketConnected();
          console.log('Socket connection check:', connected);
          setSocketReady(connected);
          if (!connected) {
            setSocketError('Socket connection timed out');
          }
        }, 3000);
        
        return () => {
          console.log('SocketProvider cleaning up');
          clearTimeout(checkTimer);
          disconnectSocket();
        };
      } catch (error) {
        console.error('Error in socket initialization:', error);
        setSocketError(error.message || 'Failed to initialize socket');
      }
    } else {
      console.log('No user token found, socket not initialized');
      setSocketError('No authentication token available');
    }
  }, []);
  
  // Provide connection status and helper functions
  const value = {
    socketReady,
    socketError,
    reinitialize: () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.idToken) {
        console.log('Reinitializing socket connection');
        disconnectSocket();
        setSocketReady(false);
        initializeSocket(user.idToken, {
          onConnect: () => {
            setSocketReady(true);
            setSocketError(null);
          }
        });
      } else {
        setSocketError('No authentication token for reinitialization');
      }
    }
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for using socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};