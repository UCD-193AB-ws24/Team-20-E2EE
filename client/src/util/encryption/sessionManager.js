import {
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher
} from '@privacyresearch/libsignal-protocol-typescript';
import { getKeys } from './keyStorage';
import { createSignalProtocolStore } from './signalStore';
import { arrayBufferToBase64, base64ToArrayBuffer } from './encyrptionUtil';

/**
 * Establishes a Signal Protocol session with a contact
 * @param {string} userId - Current user's ID
 * @param {string} recipientId - Contact's user ID
 * @param {Object} recipientKeyBundle - Recipient's key bundle from the server
 * @returns {Promise<boolean>} - True if session was established successfully
 */
export async function establishSession(userId, recipientId, recipientKeyBundle) {
  try {
    console.log(`Establishing session with ${recipientId}`, { recipientKeyBundle });
    
    // Get the local user's keys
    const localKeys = await getKeys(userId);
    if (!localKeys) {
      console.error('Local keys not found, cannot establish session');
      return false;
    }
    
    // Create a Signal Protocol store with our keys
    const store = await createSignalProtocolStore(userId, localKeys);
    
    // Create address for the recipient (using deviceId from their bundle)
    const recipientAddress = new SignalProtocolAddress(
      recipientId, 
      recipientKeyBundle.deviceId
    );
    
    console.log(`Created recipient address for ${recipientId}:${recipientKeyBundle.deviceId}`);
    
    // Create a session builder for this recipient
    const sessionBuilder = new SessionBuilder(
      store,
      recipientAddress
    );
    
    // Format the recipient's prekey bundle for the session builder
    const preKeyBundle = {
      registrationId: recipientKeyBundle.registrationId,
      identityKey: base64ToArrayBuffer(recipientKeyBundle.identityPubKey),
      signedPreKey: {
        keyId: recipientKeyBundle.signedPreKeyId,
        publicKey: base64ToArrayBuffer(recipientKeyBundle.signedPreKeyPub),
        signature: base64ToArrayBuffer(recipientKeyBundle.signedPreKeySignature)
      },
      preKey: {
        // Use the first available preKey from the bundle
        keyId: recipientKeyBundle.preKeys[0].keyId,
        publicKey: base64ToArrayBuffer(recipientKeyBundle.preKeys[0].pubKey)
      }
    };
    
    console.log('Processing prekey bundle to establish session');
    
    // Process the prekey bundle to establish a session
    await sessionBuilder.processPreKey(preKeyBundle);
    
    console.log(`Session established successfully with ${recipientId}`);
    return true;
  } catch (error) {
    console.error('Error establishing session:', error);
    return false;
  }
}

/**
 * Gets a session cipher for encrypting/decrypting messages with a specific contact
 * @param {string} userId - Current user's ID
 * @param {string} recipientUsername - Username of the contact
 * @param {number} deviceId - Device ID of the contact
 * @returns {Promise<SessionCipher>} - Session cipher for this contact
 */
export const getSessionCipher = async (userId, recipientUsername, deviceId) => {
  try {
    // Get user keys
    const localKeys = await getKeys(userId);
    if (!localKeys) {
      console.error('Local keys not found, cannot create session cipher');
      return null;
    }
    
    // Create store
    const store = await createSignalProtocolStore(userId, localKeys);
    
    const address = new SignalProtocolAddress(
      recipientUsername,
      deviceId
    );
    
    return new SessionCipher(store, address);
  } catch (error) {
    console.error('Error creating session cipher:', error);
    return null;
  }
};

/**
 * Checks if a session exists with a specific contact
 * @param {string} userId - Current user's ID
 * @param {string} recipientUsername - Username of the contact
 * @param {number} deviceId - Device ID of the contact
 * @returns {Promise<boolean>} - Whether a session exists
 */
export const hasSession = async (userId, recipientUsername, deviceId) => {
  try {
    // Get user keys
    const localKeys = await getKeys(userId);
    if (!localKeys) {
      console.error('Local keys not found, cannot check session');
      return false;
    }
    
    // Create store
    const store = await createSignalProtocolStore(userId, localKeys);
    
    const address = new SignalProtocolAddress(
      recipientUsername,
      deviceId
    );
    
    const session = await store.loadSession(address.toString());
    return !!session;
  } catch (error) {
    console.error('Error checking session existence:', error);
    return false;
  }
};