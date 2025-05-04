import getCurrentUser from './getCurrentUser';

const DB_NAME = 'UserMessagesDB';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';

// Open the database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening messages database:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create a messages store with composite key [userId, recipientId, messageId]
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const messagesStore = db.createObjectStore(MESSAGES_STORE, { 
          keyPath: ['userId', 'recipientId', 'messageId'] 
        });
        
        // Create indexes for efficient lookups
        messagesStore.createIndex('by_user', 'userId', { unique: false });
        messagesStore.createIndex('by_conversation', ['userId', 'recipientId'], { unique: false });
        messagesStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
};

/**
 * Store a message in the database
 * @param {Object} message - The message to store
 * @param {string} message.messageId - Unique ID for the message
 * @param {string} message.recipientId - The recipient's user ID
 * @param {string} message.text - The plaintext content
 * @param {boolean} message.isOutgoing - Whether this is an outgoing message
 * @param {string} message.timestamp - ISO timestamp string
 * @returns {Promise<Object>} The stored message
 */
export const storeMessage = async (message) => {
  try {
    if (!message.messageId) {
      throw new Error('Message must have a messageId');
    }
    
    const user = getCurrentUser();
    if (!user || !user.uid) {
      throw new Error('No current user found');
    }
    
    const userId = user.uid;
    
    // For incoming messages, the recipient is the current user
    // For outgoing messages, the recipient is the other user
    const recipientId = message.isOutgoing ? message.recipientId : message.senderId;
    
    if (!recipientId) {
      throw new Error('Message must have a recipientId or senderId based on direction');
    }
    
    const messageToStore = {
      ...message,
      userId,
      recipientId,
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      console.log('Storing message:', messageToStore);
      
      const request = store.put(messageToStore);
      
      request.onerror = (event) => {
        console.error('Error storing message:', event.target.error);
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
    console.error('Failed to store message:', error);
    throw error;
  }
};

/**
 * Get all messages between the current user and a specific recipient
 * @param {string} recipientId - The recipient's user ID
 * @returns {Promise<Array>} Array of message objects sorted by timestamp
 */
export const getConversationMessages = async (recipientId) => {
  try {
    const user = getCurrentUser();
    if (!user || !user.uid) {
      throw new Error('No current user found');
    }
    
    const userId = user.uid;
    
    console.log(`Fetching messages for conversation between ${userId} and ${recipientId}`);
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('by_conversation');
      
      // Get all messages where userId and recipientId match (outgoing messages)
      const outgoingRequest = index.getAll([userId, recipientId]);
      
      outgoingRequest.onsuccess = () => {
        const outgoingMessages = outgoingRequest.result || [];
        console.log(`Found ${outgoingMessages.length} outgoing messages`);
        
        // Also get messages where current user is recipient, and the other user is sender
        // First check if we need to swap our query parameters
        const incomingRequest = index.getAll([userId, recipientId]);
        
        incomingRequest.onsuccess = () => {
          const incomingMessages = incomingRequest.result || [];
          console.log(`Found ${incomingMessages.length} incoming messages`);
          
          // Combine, deduplicate by messageId and sort by timestamp
          const messagesMap = new Map();
          
          [...outgoingMessages, ...incomingMessages].forEach(msg => {
            messagesMap.set(msg.messageId, msg);
          });
          
          const allMessages = Array.from(messagesMap.values());
          allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          console.log(`Returning ${allMessages.length} total messages`);
          resolve(allMessages);
        };
        
        incomingRequest.onerror = (event) => {
          console.error('Error retrieving incoming messages:', event.target.error);
          reject(event.target.error);
        };
      };
      
      outgoingRequest.onerror = (event) => {
        console.error('Error retrieving outgoing messages:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get conversation messages:', error);
    return [];
  }
};

/**
 * Get all conversations for the current user
 * @returns {Promise<Array>} Array of unique recipient IDs
 */
export const getConversations = async () => {
  try {
    const user = getCurrentUser();
    if (!user || !user.uid) {
      throw new Error('No current user found');
    }
    
    const userId = user.uid;
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('by_user');
      
      const request = index.getAll(userId);
      
      request.onerror = (event) => {
        console.error('Error retrieving conversations:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        const messages = request.result || [];
        
        // Extract unique recipient IDs to get the list of conversations
        const recipientIds = [...new Set(messages.map(msg => msg.recipientId))];
        
        // Create a map of conversation metadata
        const conversations = recipientIds.map(recipientId => {
          const conversationMessages = messages.filter(msg => msg.recipientId === recipientId);
          const lastMessage = conversationMessages.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          )[0];
          
          return {
            userId,
            recipientId,
            lastMessage: lastMessage?.text,
            lastUpdated: lastMessage?.timestamp,
            messageCount: conversationMessages.length
          };
        });
        
        resolve(conversations);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return [];
  }
};

/**
 * Get a specific message by ID
 * @param {string} messageId - The message ID to retrieve
 * @returns {Promise<Object|null>} The message or null if not found
 */
export const getMessage = async (messageId) => {
  try {
    const user = getCurrentUser();
    if (!user || !user.uid) {
      throw new Error('No current user found');
    }
    
    const userId = user.uid;
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      // Since we don't know the recipientId, we need to search all messages
      const cursorRequest = store.openCursor();
      let foundMessage = null;
      
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          const message = cursor.value;
          if (message.userId === userId && message.messageId === messageId) {
            foundMessage = message;
            resolve(foundMessage);
            return;
          }
          cursor.continue();
        } else {
          // No more messages to search
          resolve(foundMessage);
        }
      };
      
      cursorRequest.onerror = (event) => {
        console.error('Error retrieving message:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get message:', error);
    return null;
  }
};

/**
 * Clear all messages for testing/debugging purposes
 */
export const clearAllMessages = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All messages cleared from IndexedDB');
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error clearing messages:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to clear messages:', error);
    throw error;
  }
};