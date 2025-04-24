import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { storeKeys } from './keyStorage';
import { getDeviceId } from '../deviceId';

/**
 * The number of one-time pre-keys to generate
 * @type {number}
 */
const PRE_KEY_COUNT = 100;

/**
 * The starting ID for one-time pre-keys
 * @type {number}
 */
const STARTING_PRE_KEY_ID = 1;

/**
 * Generates a complete set of keys for Signal Protocol
 * @param {string} userId - User ID to associate with these keys
 * @returns {Promise<import('./types').KeyGenerationResult>} Generated keys
 */
export async function generateSignalProtocolKeys(userId) {
  try {
    // Generate identity key pair
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    
    // Generate registration ID
    const registrationId = KeyHelper.generateRegistrationId();
    
    // Generate signed pre-key (ID: 1)
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
    
    // Generate one-time pre-keys
    const preKeys = await generatePreKeys(STARTING_PRE_KEY_ID, PRE_KEY_COUNT);
    
    // Bundle all keys together
    const keys = {
      uid: userId, 
      identityKeyPair,
      registrationId,
      signedPreKey,
      preKeys
    };
    
    // Store keys securely
    await storeKeys(userId, keys);
    
    return keys;
  } catch (error) {
    console.error('Error generating Signal Protocol keys:', error);
    throw new Error('Failed to generate encryption keys');
  }
}

/**
 * Generate multiple one-time pre-keys
 * @param {number} startId - Starting ID for the pre-keys
 * @param {number} count - How many pre-keys to generate
 * @returns {Promise<Array<import('./types').PreKeyPair>>} Array of generated pre-key pairs
 */
async function generatePreKeys(startId, count) {
  const preKeys = [];
  
  for (let i = 0; i < count; i++) {
    const preKey = await KeyHelper.generatePreKey(startId + i);
    preKeys.push(preKey);
  }
  
  return preKeys;
}

/**
 * Converts an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} Base64 encoded string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Creates a key bundle suitable for uploading to the server
 * @param {import('./types').KeyGenerationResult} keys - The generated keys
 * @returns {import('./types').KeyBundle} Bundle of public keys for the server
 */
export function createKeyBundle(keys) {
  const { identityKeyPair, registrationId, signedPreKey, preKeys } = keys;
  
  // Format pre-keys for the bundle (public keys only, converted to base64)
  const preKeysPublic = preKeys.map(pk => ({
    keyId: pk.keyId,
    pubKey: arrayBufferToBase64(pk.keyPair.pubKey)
  }));
  
  // Create the bundle with only public keys and necessary information
  return {
    uid: keys.uid,
    deviceId: getDeviceId(),
    registrationId,
    identityPubKey: arrayBufferToBase64(identityKeyPair.pubKey),
    signedPreKeyId: signedPreKey.keyId,
    signedPreKeyPub: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
    signedPreKeySignature: arrayBufferToBase64(signedPreKey.signature),
    preKeys: preKeysPublic
  };
}