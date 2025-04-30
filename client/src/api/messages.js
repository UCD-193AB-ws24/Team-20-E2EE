import { BACKEND_URL } from '../config/config.js';
import fetchWithAuth from '../util/FetchWithAuth';
import getCurrentUser from '../util/getCurrentUser.js';
import { getSessionCipher, hasSession, arrayBufferToBase64, base64ToArrayBuffer } from '../util/encryption';
import { getDeviceId } from '../util/deviceId.js';

// Get chat history between current user and another user
export const getChatHistory = async (username) => {
  try {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/history?username=${username}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chat history');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return { messages: [] };
  }
};

// Get message previews for all friends
export const getAllMessagePreviews = async () => {
  try {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/previews`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch message previews');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching message previews:', error);
    return { previews: [] };
  }
};

export const sendPrivateMessage = async (recipientUsername, text, recipientInfo) => {
  try {
    const recipientUID = recipientInfo.uid;
    const recipientDeviceId = recipientInfo.deviceId; 

    // return await response.json();
    console.log('Sending message to:', recipientUsername, 'with text:', text, 'and UID:', recipientUID, 'and deviceID:', recipientDeviceId);
    console.log('UID:', getCurrentUser().uid);

    const userId = getCurrentUser().uid;

    const sessionExists = await hasSession(userId, recipientUID, recipientDeviceId);
    if (!sessionExists) {
      console.error('No secure session established with this recipient');
      throw new Error('No secure session established with this recipient');
    }

    console.log('Session exists, proceeding to send message');

    const sessionCipher = await getSessionCipher(userId, recipientUID, recipientDeviceId);
    if (!sessionCipher) {
      throw new Error('Failed to create session cipher');
    }
    
    console.log('Session cipher created successfully, encrypting message...');

    const plaintextBuffer = new TextEncoder().encode(text).buffer;
    
    const encryptedMessage = await sessionCipher.encrypt(plaintextBuffer);

    console.log('Encrypted message:', encryptedMessage);

    // const response = await fetchWithAuth(`${BACKEND_URL}/api/message/send`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ 
    //     recipientUsername,
    //     encryptedMessage: {
    //       type: encryptedMessage.type,
    //       body: encryptedMessage.body
    //     }
    //   }),
    // });

    // return await response.json();
    await testDecryption(encryptedMessage);

    return;
  } catch (error) {
    console.error('Error sending message', error);
    return;
  }
};

export const decryptMessage = async (encryptedMessage, senderId, senderDeviceId, recipientId = null) => {
  try {
    const userId = getCurrentUser().uid;
    const isSelfMessage = senderId === userId;
    
    console.log('Attempting to decrypt message from:', senderId, 'with deviceId:', senderDeviceId);
    console.log('Is own message:', isSelfMessage);
    
    let sessionCipher;
    
    if (isSelfMessage) {
      // For messages sent by yourself, you need the recipient's info to get the right cipher
      if (!recipientId) {
        console.error('Recipient ID is required to decrypt your own messages');
        throw new Error('Cannot decrypt own message without recipient information');
      }
      
      // For messages you sent, you need to use the same cipher you used to encrypt
      sessionCipher = await getSessionCipher(recipientId, userId, senderDeviceId);
      console.log('Using cipher for recipient:', recipientId);
    } else {
      // For messages from others, use their sender info for the cipher
      sessionCipher = await getSessionCipher(userId, senderId, senderDeviceId);
    }
    
    if (!sessionCipher) {
      throw new Error('Failed to create session cipher for decryption');
    }
    
    console.log('Session cipher created successfully, decrypting message...');
    
    // Prepare the cipher message object
    const cipherMessage = {
      type: encryptedMessage.type,
      body: base64ToArrayBuffer(encryptedMessage.body)
    };

    console.log("cipher message: ", cipherMessage);
    
    // Decrypt the message
    let decryptedBuffer;
    if (cipherMessage.type === 3) {
      // This is a PreKeyWhisperMessage (initial message in a session)
      decryptedBuffer = await sessionCipher.decryptPreKeyWhisperMessage(cipherMessage.body);
    } else {
      // This is a normal WhisperMessage
      decryptedBuffer = await sessionCipher.decryptWhisperMessage(cipherMessage.body);
    }
    
    // Convert buffer to string
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    console.log('Message decrypted successfully');
    
    return decryptedText;
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw error;
  }
};

const testDecryption = async (encryptedMessage) => {
  const message = await decryptMessage(encryptedMessage, getCurrentUser().uid , getDeviceId , "68116367f612b650597d7ec1");
  console.log("Decrypted message:", message);
}
