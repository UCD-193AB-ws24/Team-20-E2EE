import { getCurrentUser } from './getCurrentUser';

// ***************
// UNFINISHED 
// ***************


const DB_NAME = 'e2ee-user-messages-db';
const DB_VERSION = 1;
const MESSAGES_STORE = 'user-messages';

// Open the database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening user messages database:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create the messages object store with messageId as key path
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const objectStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'messageId' });
        
        // Create indexes for efficient queries
        objectStore.createIndex('senderId', 'senderId', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
};

/**
 * Store a message sent by the current user
 * @param {Object} message - The message to store
 * @param {string} message.messageId - Unique ID for the message
 * @param {string} message.text - The plaintext content
 * @returns {Promise<Object>} The stored message
 */
export const storeUserMessage = async (message) => {
  try {
    if (!message.messageId) {
      throw new Error('Message must have a messageId');
    }
    
    if (!senderId) {
      throw new Error('No current user found');
    }
    
    const messageToStore = {
      ...message,
    };
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      const request = store.put(messageToStore);
      
      request.onerror = (event) => {
        console.error('Error storing user message:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        resolve(messageToStore);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to store user message:', error);
    throw error;
  }
};

/**
 * Get a user's sent message by ID
 * @param {string} messageId - The message ID to retrieve
 * @returns {Promise<Object|null>} The message or null if not found
 */
export const getUserMessage = async (messageId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      const request = store.get(messageId);
      
      request.onerror = (event) => {
        console.error('Error retrieving user message:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get user message:', error);
    return null;
  }
};
