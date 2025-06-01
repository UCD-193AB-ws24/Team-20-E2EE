import { BACKEND_URL } from '../config/config';
import fetchWithAuth from '../util/FetchWithAuth';
import getCurrentUser from '../util/getCurrentUser.js';
import { getSessionCipher, hasSession, arrayBufferToBase64, base64ToArrayBuffer, establishSession } from '../util/encryption';
import { getDeviceId } from '../util/deviceId.js';
import { storeMessage } from '../util/messagesStore.js';
import { searchFriendUid, searchUsername } from "./friends.js";
import { fetchKeyBundle, fetchAllUserKeyBundles } from './keyBundle.js';

// Get all unread messages or specific chat history
export const getChatHistory = async (username = null) => {
  try {
    let url = `${BACKEND_URL}/api/message/history`;
    
    // Always include device ID for proper filtering
    const deviceId = getDeviceId();
    const params = new URLSearchParams();

    // Only add username parameter if provided
    if (username) {
      params.append('username', username);
    }

    // Always include device ID to filter messages for this specific device
    params.append('deviceId', deviceId);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId // Also send in header as backup
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch chat history");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return { messages: [] };
  }
};

export const getGroupHistory = async (groupId) => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/get-group-history?groupId=${groupId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch chat history");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return { messages: [] };
  }
};

export const getArchivedChatHistory = async ( chatId ) => {
  try {
    console.log("chatId: ", chatId);
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/archive?chatId=${chatId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });


    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch archive");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching archive:", error);
    return { messages: [] };
  }
};


// Get message previews for all friends
export const getAllMessagePreviews = async () => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/previews`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch message previews");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching message previews:", error);
    return { previews: [] };
  }
};

export const sendPrivateMessage = async (recipientUsername, text, recipientInfo, metadata) => {
  try {
    const senderDeviceId = getDeviceId();
    const userId = getCurrentUser().uid;

    console.log(`Sending message to ${recipientUsername}`);

    // Determine if we need single device or all devices
    let keyBundleResult;
    
    if (recipientInfo && recipientInfo.deviceId) {
      // If we have specific device info, try to get key bundle for that specific device first
      console.log(`Targeting specific device: ${recipientInfo.deviceId}`);
      keyBundleResult = await fetchAllUserKeyBundles(recipientUsername);
    } else {
      // For new conversations, get all devices
      keyBundleResult = await fetchAllUserKeyBundles(recipientUsername);
    }

    if (!keyBundleResult.success) {
      // Fallback to single device bundle
      console.log('Multi-device fetch failed, trying single device...');
      const singleBundle = await fetchKeyBundle(recipientUsername);
      if (!singleBundle.success) {
        throw new Error(`Failed to fetch key bundles for ${recipientUsername}: ${singleBundle.error}`);
      }
      keyBundleResult = {
        success: true,
        keyBundles: [singleBundle.keyBundle],
        deviceCount: 1
      };
    }

    const encryptedMessages = [];
    
    // Process each device
    for (const deviceBundle of keyBundleResult.keyBundles) {
      const recipientUID = deviceBundle.uid;
      const recipientDeviceId = deviceBundle.deviceId;

      try {
        // Check if session exists for this device
        const sessionExists = await hasSession(userId, recipientUID, recipientDeviceId);
        if (!sessionExists) {
          console.log(`No session exists with ${recipientUsername} device ${recipientDeviceId}, establishing session`);
          
          const sessionEstablished = await establishSession(userId, recipientUID, deviceBundle);
          if (!sessionEstablished) {
            console.error(`Failed to establish session with ${recipientUsername} device ${recipientDeviceId}`);
            continue; // Skip this device
          }
          
          console.log(`Successfully established session with ${recipientUsername}:${recipientDeviceId}`);
        }

        // Get session cipher for this device
        const sessionCipher = await getSessionCipher(userId, recipientUID, recipientDeviceId);
        if (!sessionCipher) {
          console.error(`Failed to create session cipher for device ${recipientDeviceId}`);
          continue;
        }

        // Encrypt message for this device
        const plaintextBuffer = new TextEncoder().encode(text).buffer;
        const encryptedMessage = await sessionCipher.encrypt(plaintextBuffer);

        let processedBody;
        if (typeof encryptedMessage.body === "string") {
          const bytes = new Uint8Array(encryptedMessage.body.length);
          for (let i = 0; i < encryptedMessage.body.length; i++) {
            bytes[i] = encryptedMessage.body.charCodeAt(i);
          }
          processedBody = bytes.buffer;
        } else if (encryptedMessage.body instanceof ArrayBuffer) {
          processedBody = encryptedMessage.body;
        } else {
          throw new Error(`Unexpected message body type: ${typeof encryptedMessage.body}`);
        }

        const base64Body = arrayBufferToBase64(processedBody);

        encryptedMessages.push({
          deviceId: recipientDeviceId,
          encryptedMessage: {
            type: encryptedMessage.type,
            body: base64Body
          }
        });

        console.log(`Successfully encrypted message for device ${recipientDeviceId} (type: ${encryptedMessage.type})`);
      } catch (encryptionError) {
        console.error(`Failed to encrypt message for device ${deviceBundle.deviceId}:`, encryptionError);
        // Continue with other devices
      }
    }

    if (encryptedMessages.length === 0) {
      throw new Error(`Failed to encrypt message for any device of ${recipientUsername}`);
    }

    console.log(`Successfully encrypted message for ${encryptedMessages.length} out of ${keyBundleResult.keyBundles.length} devices`);

    // Send all encrypted messages to server
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientUsername,
        senderDeviceId,
        encryptedMessages, // Array of device-specific encrypted messages
        metadata,
      }),
    });

    const result = await response.json();

    // Store message in IndexedDB
    if (result.success) {
      try {
        const messageObject = {
          messageId: result.messageIds[0], // Use first message ID as primary
          recipientId: keyBundleResult.keyBundles[0].uid,
          text,
          isOutgoing: true,
          timestamp: new Date().toISOString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: 'Me',
          metadata: metadata,
        };

        await storeMessage(messageObject);
      } catch (error) {
        console.log("Error saving sent message to IndexedDB: ", error);
      }
    }

    return result;
  } catch (error) {
    console.error("Error sending message", error);
    throw error;
  }
};

export const sendGroupMessage = async (groupId, text, members) => {
  try {
    const userId = getCurrentUser().uid;
    const results = [];

    for (const member of members) {
      if (member === userId) {
        console.log("Skipping self in group message");
        continue;
      }

      try {
        console.log("Processing group message for member:", member);
        const { username } = await searchUsername(member);
        console.log("Fetched username:", username);

        const recipientKeyBundle = await fetchKeyBundle(username);
        if (!recipientKeyBundle.success) {
          console.error(`Failed to fetch key bundle for ${username}:`, recipientKeyBundle.error);
          continue; // Skip this member but continue with others
        }

        const recipientUid = recipientKeyBundle.keyBundle.uid;
        const recipientDeviceId = recipientKeyBundle.keyBundle.deviceId;

        const sessionExists = await hasSession(userId, recipientUid, recipientDeviceId);
        if (!sessionExists) {
          console.log(`No session exists with ${username}, establishing new session`);
          const sessionEstablished = await establishSession(userId, recipientUid, recipientKeyBundle.keyBundle);
          
          if (!sessionEstablished) {
            console.error(`Failed to establish session with ${username}, skipping this member`);
            continue; // Skip this member but continue with others
          }
          
          console.log(`Successfully established session with ${username}`);
        }

        const metadata = {
          isGroupMessage: true,
          groupId: groupId,
        };

        // Send the message to this member
        const result = await sendPrivateMessage(
          username, 
          text, 
          { uid: recipientUid, deviceId: recipientDeviceId }, 
          metadata
        );
        
        results.push({ member: username, success: !!result?.success, result });
        console.log(`Successfully sent group message to ${username}`);
        
      } catch (memberError) {
        console.error(`Error sending group message to member ${member}:`, memberError);
        results.push({ member, success: false, error: memberError.message });
        // Continue with other members even if one fails
      }
    }

    console.log("Group message sending completed. Results:", results);
    return {
      success: true,
      results,
      totalMembers: members.length - 1, // Excluding self
      successfulSends: results.filter(r => r.success).length
    };

  } catch (error) {
    console.error("Error sending group message", error);
    throw error;
  }
};

// Create a group chat
export const createGroupChat = async (groupName, members) => {
  console.log("Creating group chat with name:", groupName);
  console.log("Members:", members);
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/create-group`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupName, members }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create group chat");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating group chat", error);
    return;
  }
};

// get all group chat
export const getAllGroupChat = async () => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/get-groups`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch group chat");
    }

    return data.groups;
  } catch (error) {
    console.error("Error fetching group chat", error);
    return;
  }
};

// add member to group chat
export const addMemberToGroup = async (groupId, memberUsername) => {
  try {
    //Find member id by username
    const { uid: memberId } = await searchFriendUid(memberUsername);
    if (!memberId) {
      throw new Error("Member not found");
    }

    // Add member to group chat
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/add-member-to-group`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId, memberId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add member to group chat");
    }

    return response.json();
  } catch (error) {
    console.error("Error adding member to group", error);
    return;
  }
};

export const removeMemberFromGroup = async (groupId, memberUsername) => {
  try {
    //Find member id by username
    const { uid: memberId } = await searchFriendUid(memberUsername);
    if (!memberId) {
      throw new Error("Member not found");
    }

    // Remove member from group chat
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/remove-member-from-group`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId, memberId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove member from group chat");
    }

    return response.json();
  } catch (error) {
    console.error("Error removing member from group", error);
    return;
  }
};


// update group name
export const updateGroupName = async (groupId, groupName) => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/update-group-name`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId, groupName }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update group name");
    }
  } catch (error) {
    console.error("Error updating group name", error);
    return;
  }
};

export const decryptMessage = async (msg) => {
  try {
    const userId = getCurrentUser().uid;
    const senderId = msg.senderUid;
    const senderDeviceId = msg.senderDeviceId;
    const recipientDeviceId = msg.recipientDeviceId;
    const currentDeviceId = getDeviceId();

    console.log('Attempting to decrypt message from:', senderId, 'with deviceId:', senderDeviceId);
    console.log('Message target device:', recipientDeviceId, 'Current device:', currentDeviceId);

    // Only decrypt messages intended for this device
    if (recipientDeviceId && recipientDeviceId !== currentDeviceId) {
      console.log(`Message is for device ${recipientDeviceId}, but we are ${currentDeviceId}. Skipping decryption.`);
      return null;
    }

    if (!recipientDeviceId) {
      console.warn('Message has no target device ID - this may be a legacy message or multi-device broadcast');
    }

    // Check if we have a session for this sender device
    const sessionExists = await hasSession(userId, senderId, senderDeviceId);
    
    if (!sessionExists) {
      console.log(`No session exists with ${senderId}:${senderDeviceId}, this should be a PreKeyWhisperMessage that establishes the session`);
      
      if (msg.encryptedMessage.type !== 3) {
        console.error('Received regular message without existing session');
        throw new Error(`No session exists for regular message from ${senderId}:${senderDeviceId}`);
      }
      
      console.log('This is a PreKeyWhisperMessage - it will establish the session during decryption');
    }

    // Get session cipher for decryption
    let sessionCipher = await getSessionCipher(userId, senderId, senderDeviceId);

    if (!sessionCipher) {
      throw new Error('Failed to create session cipher for decryption');
    }

    console.log('Session cipher created successfully, decrypting message...');
    console.log("encrypted body: ", msg.encryptedMessage.body);

    let processedBody;

    if (typeof msg.encryptedMessage.body === 'string') {
      console.log("Decoding Base64 string to binary buffer");
      processedBody = base64ToArrayBuffer(msg.encryptedMessage.body);
      console.log(`Decoded Base64 string to ArrayBuffer of byteLength ${processedBody.byteLength}`);
    } else if (msg.encryptedMessage.body instanceof ArrayBuffer) {
      console.log("Body is already an ArrayBuffer");
      processedBody = msg.encryptedMessage.body;
    } else if (msg.encryptedMessage.body instanceof Uint8Array) {
      console.log("Body is a Uint8Array, converting to ArrayBuffer");
      processedBody = msg.encryptedMessage.body.buffer;
    } else {
      console.error("Unsupported body type:", typeof msg.encryptedMessage.body);
      throw new Error(`Unexpected message body type: ${typeof msg.encryptedMessage.body}`);
    }

    console.log("Decoded ArrayBuffer:", processedBody);
    // Log the version byte
    const versionByte = new Uint8Array(processedBody)[0];
    console.log("Version byte:", versionByte);

    // Prepare the cipher message object
    const cipherMessage = {
      type: msg.encryptedMessage.type,
      body: processedBody
    };

    console.log("cipher message: ", cipherMessage);

    // Decrypt the message
    let decryptedBuffer;
    if (cipherMessage.type === 3) {
      try {
        console.log("Decrypting PreKeyWhisperMessage - this will establish/update the session");
        // This is a PreKeyWhisperMessage (initial message in a session)
        // The prekey used for encryption is embedded in the message itself
        decryptedBuffer = await sessionCipher.decryptPreKeyWhisperMessage(cipherMessage.body);
        console.log("Successfully decrypted PreKeyWhisperMessage and established session");

        // Verify session was established
        const sessionEstablished = await hasSession(userId, senderId, senderDeviceId);
        console.log("Session established status:", sessionEstablished);

        // Log the first few bytes of decrypted content for debugging
        const firstBytes = new Uint8Array(decryptedBuffer.slice(0, 10));
        console.log("First bytes of decrypted content:", Array.from(firstBytes));
      } catch (prekeyError) {
        console.error("PreKeyWhisperMessage decryption failed:", prekeyError);
        console.error("Error details:", prekeyError.message);

        // For PreKeyWhisperMessage, if it fails, it usually means:
        // 1. The prekey was already used (Bad MAC)
        // 2. The message is corrupted
        // 3. There's a version mismatch
        
        if (prekeyError.message.includes("Bad MAC")) {
          // This is likely because the prekey in the message was already consumed
          console.error("PreKey message failed with Bad MAC - prekey likely already used");
          
          // Get sender info for better error reporting
          try {
            const senderInfo = await getSenderInfo(senderId);
            const senderName = senderInfo ? senderInfo.username : senderId;
            throw new Error(`Cannot decrypt message from ${senderName} - encryption keys may be out of sync. Please ask them to send a new message.`);
          } catch (infoError) {
            throw new Error('Cannot decrypt message - encryption keys may be out of sync. Please ask sender to send a new message.');
          }
        } else {
          throw prekeyError;
        }
      }
    } else {
      // Regular message handling
      try {
        console.log("Decrypting regular WhisperMessage");
        decryptedBuffer = await sessionCipher.decryptWhisperMessage(cipherMessage.body);
        console.log("Successfully decrypted WhisperMessage");
      } catch (whisperError) {
        console.error("WhisperMessage decryption failed:", whisperError);
        
        // If regular message fails, the session might be out of sync
        if (whisperError.message.includes("Bad MAC")) {
          console.log("Regular message decryption failed, session might be out of sync");
          
          // For regular messages, we can try to get sender info for better error
          try {
            const senderInfo = await getSenderInfo(senderId);
            const senderName = senderInfo ? senderInfo.username : senderId;
            throw new Error(`Message from ${senderName} could not be decrypted - session out of sync. Please ask them to restart their app.`);
          } catch (infoError) {
            throw new Error(`Message decryption failed - session out of sync with ${senderDeviceId}`);
          }
        }
        
        throw whisperError;
      }
    }

    // Convert buffer to string
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    console.log('Message decrypted successfully: ', decryptedText);

    // Store message in IndexedDB
    try {
      await storeMessage({
        messageId: msg._id,
        recipientId: userId,
        senderId: senderId,
        senderDeviceId: senderDeviceId, // Store sender device ID
        text: decryptedText,
        isOutgoing: false,
        time: msg.time,
        timestamp: msg.timestamp,
        status: 'received',
        metadata: msg.metadata
      });
    } catch (error) {
      console.log("Error saving decrypted Message to storage:", error);
    }

    // Archive if enabled
    if (await archiveEnabledCheck(senderId)) {
      console.log("Archiving message: ", decryptedText);
      fetchWithAuth(`${BACKEND_URL}/api/message/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: buildChatId(userId, senderId),
          senderUid: senderId,
          recipientUid: userId,
          text: decryptedText,
          timestamp: msg.timestamp,
        })
      });
    }

    return decryptedText;
  } catch (error) {
    console.error('Error decrypting message:', error);
    
    // Store failed decryption for debugging - fix the userId scope issue
    const userId = getCurrentUser().uid; // Define userId in catch block
    try {
      await storeMessage({
        messageId: msg._id,
        recipientId: userId,
        senderId: msg.senderUid,
        senderDeviceId: msg.senderDeviceId,
        text: `[Failed to decrypt: ${error.message}]`,
        isOutgoing: false,
        time: msg.time,
        timestamp: msg.timestamp,
        status: 'decryption_failed',
        error: error.message,
        metadata: msg.metadata
      });
    } catch (storageError) {
      console.error("Failed to store error message:", storageError);
    }
    
    throw error;
  }
};

// Helper function to get sender info by UID
const getSenderInfo = async (senderId) => {
  try {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/user/info/${senderId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sender info');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching sender info:', error);
    return null;
  }
};

export const archiveEnabledCheck = async (otherUserId) => {
  const currentUser = getCurrentUser();
  if (!currentUser || !otherUserId) return false;

  const chatId = buildChatId(currentUser.uid, otherUserId);

  try {
    const res = await fetchWithAuth(`${BACKEND_URL}/api/message/archiveStatus?chatId=${chatId}`);
    const data = await res.json();
    return res.ok && data.archiveEnabled;
  } catch (err) {
    console.error("Failed to fetch archive status:", err);
    return false;
  }
};

export const toggleArchive = async (otherUserId, optIn) => {
  const user = getCurrentUser();
  if (!user || !otherUserId) return false;

  const chatId = buildChatId(user.uid, otherUserId);

  try {
    const res = await fetchWithAuth(`${BACKEND_URL}/api/message/toggleArchive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, uid: user.uid, optIn })
    });

    const data = await res.json();
    return res.ok && data.archiveEnabled;
  } catch (err) {
    console.error("Archive toggle failed:", err);
    return false;
  }
};

export const checkUserOptInStatus = async (currentUid, otherUid) => {
  const chatId = buildChatId(currentUid, otherUid);
  try {
    const res = await fetchWithAuth(`${BACKEND_URL}/api/message/userArchive?chatId=${chatId}&uid=${currentUid}`);
    const data = await res.json();
    return res.ok && data.optedIn;
  } catch (err) {
    console.error("Failed to fetch opt-in status:", err);
    return false;
  }
};

export const buildChatId = (userA, userB) => {
  return [userA, userB].sort().join("-")
}
