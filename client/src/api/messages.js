import { BACKEND_URL } from "../config/config.js";
import fetchWithAuth from "../util/FetchWithAuth";
import getCurrentUser from "../util/getCurrentUser.js";
import {
  getSessionCipher,
  hasSession,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../util/encryption";
import { getDeviceId } from "../util/deviceId.js";
import { storeMessage } from "../util/messagesStore.js";
import { searchFriendUid } from "./friends.js";
import { fetchKeyBundle } from "./keyBundle.js";
import { searchUsername } from "./friends.js";

// Get all unread messages or specific chat history
export const getChatHistory = async (username = null) => {
  try {
    let url = `${BACKEND_URL}/api/message/history`;

    // Only add username parameter if provided
    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }

    const response = await fetchWithAuth(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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

export const getArchivedChatHistory = async (token, username) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/message/history?username=${username}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
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

export const sendPrivateMessage = async (
  recipientUsername,
  text,
  recipientInfo
) => {
  try {
    const recipientUID = recipientInfo.uid;
    const recipientDeviceId = recipientInfo.deviceId;
    const senderDeviceId = getDeviceId();

    const userId = getCurrentUser().uid;

    const sessionExists = await hasSession(
      userId,
      recipientUID,
      recipientDeviceId
    );
    if (!sessionExists) {
      console.error("No secure session established with this recipient");
      throw new Error("No secure session established with this recipient");
    }

    const sessionCipher = await getSessionCipher(
      userId,
      recipientUID,
      recipientDeviceId
    );
    if (!sessionCipher) {
      throw new Error("Failed to create session cipher");
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
      if (
        encryptedMessage.body.charCodeAt(0) === 51 &&
        encryptedMessage.body.length > 1 &&
        encryptedMessage.body.charCodeAt(1) === 40
      ) {
        // '(' has ASCII value 40
        console.log(
          "Detected string represents characters, not binary. Fixing version byte."
        );

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
      throw new Error(
        `Unexpected message body type: ${typeof encryptedMessage.body}`
      );
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientUsername,
        senderDeviceId,
        encryptedMessage: {
          type: encryptedMessage.type,
          body: base64Body,
        },
      }),
    });

    const result = await response.json();

    // Store message in IndexedDB
    if (result.success) {
      try {
        const messageObject = {
          messageId: result.messageId,
          recipientId: recipientUID,
          text,
          isOutgoing: true,
          timestamp: new Date().toISOString(), // Store full ISO timestamp for sorting
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sender: "Me",
        };

        await storeMessage(messageObject);
      } catch (error) {
        console.log("Error saving sent message to IndexedDB: ", error);
      }
    }
    return result;
  } catch (error) {
    console.error("Error sending message", error);
    return;
  }
};

export const sendGroupMessage = async (groupId, text) => {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }
    const data = await response.json();
    const groupInfo = data.groups.find((group) => group._id === groupId);
    const members = groupInfo.members;

    for (const memberUid of members) {
      if (memberUid != getCurrentUser().uid) {
        try{
          const memberInfo = await searchUsername(memberUid);
          const keyBundleResponse = await fetchKeyBundle(memberInfo.username);
          console.log("Key bundle response:", keyBundleResponse);
          const keyBundle = keyBundleResponse.keyBundle;
          console.log("Key bundle for member:", memberInfo.username, keyBundle);
          const result = await sendPrivateMessage(memberInfo.username, text, keyBundle);
          console.log("Message sent to member:", memberInfo.username, result);
        }catch(error){
          console.error("Error sending message to member:", error);
        }
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending message", error);
    return;
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

    console.log(
      "Attempting to decrypt message from:",
      senderId,
      "with deviceId:",
      senderDeviceId
    );

    let sessionCipher = await getSessionCipher(
      userId,
      senderId,
      senderDeviceId
    );

    if (!sessionCipher) {
      throw new Error("Failed to create session cipher for decryption");
    }

    console.log("Session cipher created successfully, decrypting message...");
    console.log(sessionCipher);

    console.log("encrypted body: ", msg.encryptedMessage.body);

    let processedBody;

    if (typeof msg.encryptedMessage.body === "string") {
      console.log("Decoding Base64 string to binary buffer");
      processedBody = base64ToArrayBuffer(msg.encryptedMessage.body);
      console.log(
        `Decoded Base64 string to ArrayBuffer of byteLength ${processedBody.byteLength}`
      );
    } else if (msg.encryptedMessage.body instanceof ArrayBuffer) {
      console.log("Body is already an ArrayBuffer");
      processedBody = encryptedMessage.body;
    } else if (msg.encryptedMessage.body instanceof Uint8Array) {
      console.log("Body is a Uint8Array, converting to ArrayBuffer");
      processedBody = msg.encryptedMessage.body.buffer;
    } else {
      console.error("Unsupported body type:", typeof msg.encryptedMessage.body);
      throw new Error(
        `Unexpected message body type: ${typeof msg.encryptedMessage.body}`
      );
    }

    console.log("Decoded ArrayBuffer:", processedBody);
    // Log the version byte
    const versionByte = new Uint8Array(processedBody)[0];
    console.log("Version byte:", versionByte);

    // Prepare the cipher message object
    const cipherMessage = {
      type: msg.encryptedMessage.type,
      body: processedBody,
    };

    console.log("cipher message: ", cipherMessage);

    // Decrypt the message
    let decryptedBuffer;
    if (cipherMessage.type === 3) {
      try {
        console.log("Decrypting PreKeyWhisperMessage, establishing session...");
        // This is a PreKeyWhisperMessage (initial message in a session)
        decryptedBuffer = await sessionCipher.decryptPreKeyWhisperMessage(
          cipherMessage.body
        );
        console.log(
          "Successfully decrypted PreKeyWhisperMessage and established session"
        );

        // Verify session was established
        const sessionExists = await hasSession(
          userId,
          senderId,
          senderDeviceId
        );
        console.log("Session established status:", sessionExists);

        // Log the first few bytes of decrypted content for debugging
        const firstBytes = new Uint8Array(decryptedBuffer.slice(0, 10));
        console.log(
          "First bytes of decrypted content:",
          Array.from(firstBytes)
        );
      } catch (prekeyError) {
        console.error("PreKeyWhisperMessage decryption failed:", prekeyError);
        console.error("Error details:", prekeyError.message);

        // Try to get more info about the session state
        try {
          const sessionExists = await hasSession(
            userId,
            senderId,
            senderDeviceId
          );
          console.log("Session exists despite error?", sessionExists);
        } catch (e) {
          console.error("Failed to check session status:", e);
        }

        // Re-throw the error to be handled by the outer catch
        throw prekeyError;
      }
    } else {
      // Regular message handling
      decryptedBuffer = await sessionCipher.decryptWhisperMessage(
        cipherMessage.body
      );
    }

    // Convert buffer to string
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    console.log("Message decrypted successfully: ", msg);

    // Store message in IndexedDB
    try {
      await storeMessage({
        messageId: msg._id,
        recipientId: userId,
        senderId: senderId,
        text: decryptedText,
        isOutgoing: false,
        time: msg.time,
        timestamp: msg.timestamp,
        status: "received",
      });
    } catch (error) {
      console.log("Error saving decrypted Message to storage:", error);
    }

    return decryptedText;
  } catch (error) {
    console.error("Error decrypting message:", error);
    throw error;
  }
};
