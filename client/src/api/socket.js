import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config/config.js';

let socket = null;
let socketInitialized = false;

// Initialize socket connection with authentication
export const initializeSocket = (token) => {
  if (socketInitialized) return;

  socket = io(BACKEND_URL, {
    autoConnect: false,
    auth: { token }
  });

  // Connection handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.connect();
  socketInitialized = true;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socketInitialized = false;
  }
};

// Send a private message
export const sendPrivateMessage = (recipientUsername, text) => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }

  socket.emit('private_message', {
    recipientUsername,
    text
  });
  return true;
};

// Send typing indicator
export const sendTypingStatus = (recipientUsername, isTyping) => {
  if (!socket || !socket.connected) return;
  
  socket.emit('typing', {
    recipientUsername,
    isTyping
  });
};

// Register event listeners
export const registerMessageListener = (callback) => {
  if (!socket) return;
  socket.on('receive_message', callback);
};

export const registerMessageSentListener = (callback) => {
  if (!socket) return;
  socket.on('message_sent', callback);
};

export const registerTypingListener = (callback) => {
  if (!socket) return;
  socket.on('user_typing', callback);
};

export const registerUserOnlineListener = (callback) => {
  if (!socket) return;
  socket.on('user_online', callback);
};

export const registerUserOfflineListener = (callback) => {
  if (!socket) return;
  socket.on('user_offline', callback);
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
  sendPrivateMessage,
  sendTypingStatus,
  registerMessageListener,
  registerMessageSentListener,
  registerTypingListener,
  registerUserOnlineListener,
  registerUserOfflineListener,
  removeListener,
  isSocketConnected
};