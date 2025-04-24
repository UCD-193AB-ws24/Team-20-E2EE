import localforage from 'localforage';
import { encode, decode } from 'base64-arraybuffer';

// Initialize a dedicated storage instance for encryption keys
const keyStorage = localforage.createInstance({
  name: 'e2ee-keys'
});

/**
 * Stores encryption keys securely
 * @param {string} userId - The user's ID
 * @param {Object} keys - The keys to store
 * @returns {Promise<void>}
 */
export async function storeKeys(userId, keys) {
  // Convert ArrayBuffers to base64 strings for storage
  const serializedKeys = serializeKeys(keys);
  await keyStorage.setItem(`keys-${userId}`, serializedKeys);
}

/**
 * Retrieves stored encryption keys
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} The retrieved keys or null if not found
 */
export async function getKeys(userId) {
  const serializedKeys = await keyStorage.getItem(`keys-${userId}`);
  if (!serializedKeys) return null;
  
  // Convert base64 strings back to ArrayBuffers
  return deserializeKeys(serializedKeys);
}

/**
 * Deletes stored keys for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<void>}
 */
export async function deleteKeys(userId) {
  await keyStorage.removeItem(`keys-${userId}`);
}

/**
 * Helper function to serialize keys for storage
 * @param {Object} keys - The keys object to serialize
 * @returns {Object} - Serialized keys with ArrayBuffers converted to base64
 */
function serializeKeys(keys) {
  // This is a recursive function to deeply convert ArrayBuffers to base64
  return JSON.parse(JSON.stringify(keys, (key, value) => {
    // Check if the value is an ArrayBuffer or Uint8Array
    if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
      return {
        type: 'ArrayBuffer',
        data: encode(value instanceof Uint8Array ? value.buffer : value)
      };
    }
    return value;
  }));
}

/**
 * Helper function to deserialize keys from storage
 * @param {Object} serializedKeys - The serialized keys object
 * @returns {Object} - Deserialized keys with base64 strings converted to ArrayBuffers
 */
function deserializeKeys(serializedKeys) {
  // This is a recursive function to deeply convert base64 back to ArrayBuffers
  return JSON.parse(JSON.stringify(serializedKeys), (key, value) => {
    if (value && value.type === 'ArrayBuffer' && value.data) {
      return decode(value.data);
    }
    return value;
  });
}