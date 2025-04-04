import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config/config.js';

let socket = null;
let socketInitialized = false;

// Queue for listeners that try to register before socket is ready
const pendingListeners = {
  user_online: [],
  user_offline: [],
  message_sent: [],
  friend_request: [],
  friend_request_handled: [],
  user_typing: [],
  receive_message: [],
  initial_status: []
};

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
      
      // Apply any pending listeners
      Object.keys(pendingListeners).forEach(event => {
        if (pendingListeners[event].length > 0) {
          console.log(`Applying ${pendingListeners[event].length} queued listeners for ${event}`);
          pendingListeners[event].forEach(callback => {
            socket.on(event, callback);
          });
          pendingListeners[event] = [];
        }
      });
      
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

export const sendPrivateMessage = (recipientUsername, text) => {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }

  socket.emit('private_message', {
    recipientUsername,
    text
  });
};

export const sendFriendRequest = (recipientUsername) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    
    // Set up one-time listeners for the response
    const onSuccess = (data) => {
      socket.off('friend_request_error', onError);
      resolve(data);
    };
    
    const onError = (error) => {
      socket.off('friend_request_success', onSuccess);
      reject(new Error(error.error || 'Failed to send friend request'));
    };
    
    // Register temporary listeners
    socket.once('friend_request_success', onSuccess);
    socket.once('friend_request_error', onError);
    
    // Send the request
    socket.emit('send_friend_request', recipientUsername);
    
    // Timeout to prevent hanging promises
    setTimeout(() => {
      socket.off('friend_request_success', onSuccess);
      socket.off('friend_request_error', onError);
      reject(new Error('Request timed out'));
    }, 5000);
  });
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

// Register event listeners with pending queue support
export const registerMessageListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing receive_message listener");
    pendingListeners.receive_message.push(callback);
    return () => {
      const index = pendingListeners.receive_message.indexOf(callback);
      if (index !== -1) pendingListeners.receive_message.splice(index, 1);
    };
  }
  
  console.log('Registering receive_message listener');
  socket.on('receive_message', callback);
  return () => socket.off('receive_message', callback);
};

export const registerMessageSentListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing message_sent listener");
    pendingListeners.message_sent.push(callback);
    return () => {
      const index = pendingListeners.message_sent.indexOf(callback);
      if (index !== -1) pendingListeners.message_sent.splice(index, 1);
    };
  }
  
  console.log('Registering message_sent listener');
  socket.on('message_sent', callback);
  return () => socket.off('message_sent', callback);
};

export const registerTypingListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing user_typing listener");
    pendingListeners.user_typing.push(callback);
    return () => {
      const index = pendingListeners.user_typing.indexOf(callback);
      if (index !== -1) pendingListeners.user_typing.splice(index, 1);
    };
  }
  
  console.log('Registering user_typing listener');
  socket.on('user_typing', callback);
  return () => socket.off('user_typing', callback);
};

export const registerFriendRequestListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing friend_request listener");
    pendingListeners.friend_request.push(callback);
    return () => {
      const index = pendingListeners.friend_request.indexOf(callback);
      if (index !== -1) pendingListeners.friend_request.splice(index, 1);
    };
  }
  
  console.log('Registering friend_request listener');
  socket.on('receive_friend_request', callback);
  return () => socket.off('receive_friend_request', callback);
}

export const registerFriendRequestHandledListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing friend_request_handled listener");
    pendingListeners.friend_request_handled.push(callback);
    return() => {
      const index = pendingListeners.friend_request_handled.indexOf(callback);
      if (index !== -1) pendingListeners.friend_request_handled.splice(index, 1);
    };
  }

  console.log('Registering friend_request_handled listener');
  socket.on('friend_request_handled', callback);
  return () => socket.off('friend_request_handled', callback);
};

export const registerUserOnlineListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing user_online listener");
    pendingListeners.user_online.push(callback);
    return () => {
      const index = pendingListeners.user_online.indexOf(callback);
      if (index !== -1) pendingListeners.user_online.splice(index, 1);
    };
  }
  
  console.log('Registering user_online listener');
  socket.on('user_online', (data) => {
    console.log('Raw user_online event received:', data);
    callback(data);
  });
  return () => socket.off('user_online', callback);
};

export const registerUserOfflineListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing user_offline listener");
    pendingListeners.user_offline.push(callback);
    return () => {
      const index = pendingListeners.user_offline.indexOf(callback);
      if (index !== -1) pendingListeners.user_offline.splice(index, 1);
    };
  }
  
  console.log('Registering user_offline listener');
  socket.on('user_offline', (data) => {
    console.log('Raw user_offline event received:', data);
    callback(data);
  });
  return () => socket.off('user_offline', callback);
};

export const requestInitialStatus = () => {
  if (!socket || !socket.connected) {
    console.error("Socket not connected, can't request initial status");
    return false;
  }
  
  console.log("Requesting initial online status");
  socket.emit("get_initial_status");
  return true;
};

// Register handler for initial status response
export const registerInitialStatusListener = (callback) => {
  if (!socket) {
    console.warn("Socket not initialized, queuing initial_status listener");
    pendingListeners.initial_status = pendingListeners.initial_status || [];
    pendingListeners.initial_status.push(callback);
    return () => {
      const index = pendingListeners.initial_status.indexOf(callback);
      if (index !== -1) pendingListeners.initial_status.splice(index, 1);
    };
  }
  
  console.log('Registering initial_status listener');
  socket.on('initial_status', (data) => {
    console.log('Received initial status:', data);
    callback(data);
  });
  
  return () => socket.off('initial_status', callback);
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
  registerFriendRequestListener,
  registerFriendRequestHandledListener,
  registerUserOnlineListener,
  registerInitialStatusListener,
  requestInitialStatus,
  registerUserOfflineListener,
  removeListener,
  isSocketConnected
};