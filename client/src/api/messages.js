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
    const senderDeviceId = getDeviceId();

    const userId = getCurrentUser().uid;

    const sessionExists = await hasSession(userId, recipientUID, recipientDeviceId);
    if (!sessionExists) {
      console.error('No secure session established with this recipient');
      throw new Error('No secure session established with this recipient');
    }

    const sessionCipher = await getSessionCipher(userId, recipientUID, recipientDeviceId);
    if (!sessionCipher) {
      throw new Error('Failed to create session cipher');
    }
    
    const plaintextBuffer = new TextEncoder().encode(text).buffer;
    console.log("Plaintext buffer:", plaintextBuffer);
    
    const encryptedMessage = await sessionCipher.encrypt(plaintextBuffer);
    console.log("Encrypted message:", encryptedMessage);
    
    // Handle different formats of `encryptedMessage.body`
    let processedBody;
    if (typeof encryptedMessage.body === "string") {
      console.log("Converting raw string body to ArrayBuffer");
      
      // IMPORTANT: Check if the first character is actually '3' (ASCII 51)
      if (encryptedMessage.body.charCodeAt(0) === 51 && 
          encryptedMessage.body.length > 1 && 
          encryptedMessage.body.charCodeAt(1) === 40) {  // '(' has ASCII value 40
        console.log("Detected string represents characters, not binary. Fixing version byte.");
        
        // Create a modified string with actual byte 3 instead of character '3'
        const bytes = new Uint8Array(encryptedMessage.body.length);
        
        // First byte should be 3, not 51 ('3')
        bytes[0] = 51;
        
        // Copy the rest starting from position 1
        for (let i = 1; i < encryptedMessage.body.length; i++) {
          bytes[i] = encryptedMessage.body.charCodeAt(i);
        }
        
        processedBody = bytes.buffer;
      } else {
        // Regular conversion (in case this isn't the specific issue)
        const bytes = new Uint8Array(encryptedMessage.body.length);
        for (let i = 0; i < encryptedMessage.body.length; i++) {
          bytes[i] = encryptedMessage.body.charCodeAt(i);
        }
        processedBody = bytes.buffer;
      }
    } else if (encryptedMessage.body instanceof Uint8Array) {
        console.log("Body is a Uint8Array, converting to ArrayBuffer");
        processedBody = encryptedMessage.body.buffer;
    } else if (encryptedMessage.body instanceof ArrayBuffer) {
        console.log("Body is already an ArrayBuffer");
        processedBody = encryptedMessage.body;
    } else {
        console.error("Unsupported body type:", typeof encryptedMessage.body);
        throw new Error(`Unexpected message body type: ${typeof encryptedMessage.body}`);
    }
    const versionByte = new Uint8Array(processedBody)[0];
    console.log("Version byte:", versionByte);
    console.log("processed body: ", processedBody);
    // Convert the processed body to Base64
    const base64Body = arrayBufferToBase64(processedBody);
    console.log("Base64 encoded body:", base64Body);
    
    if (!base64Body) {
        console.error("Base64 encoding failed - body is empty");
        throw new Error("Base64 encoding failed");
    }

    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        recipientUsername,
        senderDeviceId,
        encryptedMessage: {
          type: encryptedMessage.type,
          body: base64Body
        }
      }),
    });

    const result = await response.json();

    console.log("result: ", result);

    return result;
  } catch (error) {
    console.error('Error sending message', error);
    return;
  }
};

export const decryptMessage = async (encryptedMessage, senderId, senderDeviceId) => {
  try {
    const userId = getCurrentUser().uid;
    
    console.log('Attempting to decrypt message from:', senderId, 'with deviceId:', senderDeviceId);
    
    let sessionCipher = await getSessionCipher(userId, senderId, senderDeviceId);
    
    if (!sessionCipher) {
      throw new Error('Failed to create session cipher for decryption');
    }
    
    console.log('Session cipher created successfully, decrypting message...');
    console.log(sessionCipher);
    
    console.log("encrypted body: ", encryptedMessage.body);

    let processedBody;
    
    if (typeof encryptedMessage.body === 'string') {
      console.log("Decoding Base64 string to binary buffer");
      processedBody = base64ToArrayBuffer(encryptedMessage.body);
      console.log(`Decoded Base64 string to ArrayBuffer of byteLength ${processedBody.byteLength}`);
    } else if (encryptedMessage.body instanceof ArrayBuffer) {
        console.log("Body is already an ArrayBuffer");
        processedBody = encryptedMessage.body;
    } else if (encryptedMessage.body instanceof Uint8Array) {
        console.log("Body is a Uint8Array, converting to ArrayBuffer");
        processedBody = encryptedMessage.body.buffer;
    } else {
        console.error("Unsupported body type:", typeof encryptedMessage.body);
        throw new Error(`Unexpected message body type: ${typeof encryptedMessage.body}`);
    }
    
    console.log("Decoded ArrayBuffer:", processedBody);
    // Log the version byte
    const versionByte = new Uint8Array(processedBody)[0];
    console.log("Version byte:", versionByte);
    
    // Prepare the cipher message object
    const cipherMessage = {
      type: encryptedMessage.type,
      body: processedBody
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
