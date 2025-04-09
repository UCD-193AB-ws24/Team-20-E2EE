import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config/config.js';

let socket = null;
let socketInitialized = false;

// Initialize socket connection with authentication
export const initializeSocket = (token, callbacks = {}) => {
  const { onConnect, onError, onDisconnect } = callbacks;
  
  if (socketInitialized && socket) {
    console.log('Socket already initialized');
    return;
  }

  console.log('Initializing socket connection');
  
  try {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Connection handlers
    socket.on('connect', () => {
      console.log(`User connected, Socket ID: ${socket.id}`);
    });

    socket.on('socket_event_listeners_ready', () => {
      console.log('Socket event listeners are ready');
      if (onConnect) onConnect();
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      if (onError) onError(err);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (onDisconnect) onDisconnect(reason);
    });

    socket.connect();
    socketInitialized = true;
  } catch (error) {
    console.error('Error initializing socket:', error);
    if (onError) onError(error);
    socketInitialized = false;
    socket = null;
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket');
    socket.disconnect();
    socketInitialized = false;
    socket = null;
  }
};

// Send typing indicator
export const sendTypingStatus = (recipientUsername, isTyping) => {
  if (!socket || !socket.connected) return false;
  
  socket.emit('typing', {
    recipientUsername,
    isTyping
  });
  return true;
};

export const registerMessageListener = (callback) => {  
  socket.on('receive_message', callback);
  return () => socket.off('receive_message', callback);
};

export const registerMessageSentListener = (callback) => {
  socket.on('message_sent', callback);
  return () => socket.off('message_sent', callback);
};

export const registerTypingListener = (callback) => {
  socket.on('user_typing', callback);
  return () => socket.off('user_typing', callback);
};

export const registerFriendRequestListener = (callback) => {
  socket.on('receive_friend_request', callback);
  return () => socket.off('receive_friend_request', callback);
}

export const registerFriendRequestHandledListener = (callback) => {
  socket.on('friend_request_handled', callback);
  return () => socket.off('friend_request_handled', callback);
};

export const registerUserOnlineListener = (callback) => {
  socket.on('user_online', (data) => {
    callback(data);
  });
  return () => socket.off('user_online', callback);
};

export const registerUserOfflineListener = (callback) => {
  socket.on('user_offline', (data) => {
    callback(data);
  });
  return () => socket.off('user_offline', callback);
};

// Register handler for initial status response
export const registerInitialStatusListener = (callback) => {
  socket.on('initial_status', (data) => {
    callback(data);
  });  
  return () => socket.off('initial_status', callback);
};

export const requestInitialStatus = () => {
  socket.emit('get_initial_status');
  return true;
};

// Remove event listeners
export const removeListener = (event) => {
  if (!socket) return;
  socket.off(event);
};

// Get socket connection status
export const isSocketConnected = () => {
  return socket?.connected || false;
};

export default {
  initializeSocket,
  disconnectSocket,
  sendTypingStatus,
  registerMessageListener,
  registerMessageSentListener,
  registerTypingListener,
  registerFriendRequestListener,
  registerFriendRequestHandledListener,
  registerUserOnlineListener,
  registerInitialStatusListener,
  requestInitialStatus,
  registerUserOfflineListener,
  removeListener,
  isSocketConnected
};