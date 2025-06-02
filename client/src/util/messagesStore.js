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
 * @param {object} message.metadata - metadata containing group info
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
      timestamp: message.timestamp || new Date().toISOString(),
      blur: false
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
        console.log(`Found ${outgoingMessages.length} total outgoing messages`);

        // Also get messages where current user is recipient, and the other user is sender
        const incomingRequest = index.getAll([userId, recipientId]);

        incomingRequest.onsuccess = () => {
          const incomingMessages = incomingRequest.result || [];
          console.log(`Found ${incomingMessages.length} total incoming messages`);

          // Combine all messages
          const allMessages = [...outgoingMessages, ...incomingMessages];

          // Filter out group messages
          const privateMessages = allMessages.filter(msg =>
            !msg.metadata || msg.metadata.isGroup === false || msg.metadata.isGroupMessage === false
          );

          console.log(`Found ${privateMessages.length} private messages after filtering out group messages`);

          // Deduplicate by messageId and sort by timestamp
          const messagesMap = new Map();
          privateMessages.forEach(msg => {
            messagesMap.set(msg.messageId, msg);
          });

          const uniqueMessages = Array.from(messagesMap.values());
          uniqueMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          console.log(`Returning ${uniqueMessages.length} total private messages`);
          resolve(uniqueMessages);
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
 * Get all messages for a specific group
 * @param {string} groupId - The group's unique identifier
 * @returns {Promise<Array>} Array of message objects sorted by timestamp
 */
export const getGroupMessages = async (groupId) => {
  try {
    const user = getCurrentUser();
    if (!user || !user.uid) {
      throw new Error('No current user found');
    }

    const userId = user.uid;

    if (!groupId) {
      throw new Error('Group ID is required in metadata');
    }

    console.log(`Fetching messages for group: ${groupId}`);

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);

      // Get all messages from the store
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter messages that belong to the specified group
        const groupMessages = request.result.filter(msg =>
          msg.metadata && msg.metadata.groupId === groupId
        );

        console.log(`Found ${groupMessages.length} messages for group ${groupId}`);

        // Sort messages by timestamp
        groupMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        resolve(groupMessages);
      };

      request.onerror = (event) => {
        console.error('Error retrieving group messages:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get group messages:', error);
    return [];
  }
};

export const blurMessages = async () => {
  const db = await openDB();
  const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
  const store = transaction.objectStore(MESSAGES_STORE);

  const request = store.getAll();

  request.onsuccess = () => {
    const now = Date.now();

    const expiredMessages = request.result.filter(msg =>
      !msg.blur && new Date(msg.timestamp).getTime() < now - 1000
    );

    expiredMessages.forEach(msg => {
      const newlyBlurred = { ...msg, blur: true };
      console.log("Blurring: ", newlyBlurred);
      store.put(newlyBlurred);
    });
  };

  transaction.oncomplete = () => {
    db.close();
  };
};