import localforage from 'localforage';

// Configure localForage to use IndexedDB first (best for binary data)
localforage.config({
  driver: [localforage.INDEXEDDB, 
           localforage.WEBSQL,
           localforage.LOCALSTORAGE]
});

// Initialize a dedicated storage instance for encryption keys
const keyStorage = localforage.createInstance({
  name: 'e2ee-keys',
});

function inspectArrayBuffer(buffer, label) {
  if (buffer instanceof ArrayBuffer || (buffer && buffer.buffer instanceof ArrayBuffer)) {
    const view = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
    const hexValues = Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`${label} [${buffer.byteLength} bytes]: ${hexValues.substring(0, 60)}${hexValues.length > 60 ? '...' : ''}`);
    return true;
  }
  return false;
}

/**
 * Stores encryption keys securely
 * @param {string} userId - The user's ID
 * @param {Object} keys - The keys to store
 * @returns {Promise<void>}
 */
export async function storeKeys(userId, keys) {
  // Inspect key buffers to see actual content
  // console.log("Identity Key Details:");
  // inspectArrayBuffer(keys.identityKeyPair.pubKey, "Public Key");
  // inspectArrayBuffer(keys.identityKeyPair.privKey, "Private Key");
  
  // console.log("Signed PreKey Details:");
  // inspectArrayBuffer(keys.signedPreKey.keyPair.pubKey, "Public Key");
  // inspectArrayBuffer(keys.signedPreKey.keyPair.privKey, "Private Key");
  // inspectArrayBuffer(keys.signedPreKey.signature, "Signature");
  
  // console.log("First PreKey Details:");
  // inspectArrayBuffer(keys.preKeys[0].keyPair.pubKey, "Public Key");
  // inspectArrayBuffer(keys.preKeys[0].keyPair.privKey, "Private Key");
  try {
    // Store keys for each part separately to preserve ArrayBuffers
    await keyStorage.setItem(`${userId}-identity-pub`, keys.identityKeyPair.pubKey);
    await keyStorage.setItem(`${userId}-identity-priv`, keys.identityKeyPair.privKey);
    await keyStorage.setItem(`${userId}-regid`, keys.registrationId);
    await keyStorage.setItem(`${userId}-uid`, keys.uid);
    
    // Store signed pre-key
    await keyStorage.setItem(`${userId}-signed-id`, keys.signedPreKey.keyId);
    await keyStorage.setItem(`${userId}-signed-pub`, keys.signedPreKey.keyPair.pubKey);
    await keyStorage.setItem(`${userId}-signed-priv`, keys.signedPreKey.keyPair.privKey);
    await keyStorage.setItem(`${userId}-signed-sig`, keys.signedPreKey.signature);
    
    // Store pre-keys (store count and each key separately)
    await keyStorage.setItem(`${userId}-prekeys-count`, keys.preKeys.length);
    
    for (let i = 0; i < keys.preKeys.length; i++) {
      const preKey = keys.preKeys[i];
      await keyStorage.setItem(`${userId}-prekey-${i}-id`, preKey.keyId);
      await keyStorage.setItem(`${userId}-prekey-${i}-pub`, preKey.keyPair.pubKey);
      await keyStorage.setItem(`${userId}-prekey-${i}-priv`, preKey.keyPair.privKey);
    }
    
    console.log("Keys stored successfully");
  } catch (error) {
    console.error("Error storing keys:", error);
    throw error;
  }
}

/**
 * Retrieves stored encryption keys
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} The retrieved keys or null if not found
 */
export async function getKeys(userId) {
  try {
    // Check if keys exist for this user
    const identityPub = await keyStorage.getItem(`${userId}-identity-pub`);
    if (!identityPub) return null;
    
    // Reconstruct the keys object
    const keys = {
      uid: await keyStorage.getItem(`${userId}-uid`),
      registrationId: await keyStorage.getItem(`${userId}-regid`),
      identityKeyPair: {
        pubKey: identityPub,
        privKey: await keyStorage.getItem(`${userId}-identity-priv`)
      },
      signedPreKey: {
        keyId: await keyStorage.getItem(`${userId}-signed-id`),
        keyPair: {
          pubKey: await keyStorage.getItem(`${userId}-signed-pub`),
          privKey: await keyStorage.getItem(`${userId}-signed-priv`)
        },
        signature: await keyStorage.getItem(`${userId}-signed-sig`)
      },
      preKeys: []
    };
    
    // Reconstruct pre-keys
    const preKeyCount = await keyStorage.getItem(`${userId}-prekeys-count`);
    for (let i = 0; i < preKeyCount; i++) {
      keys.preKeys.push({
        keyId: await keyStorage.getItem(`${userId}-prekey-${i}-id`),
        keyPair: {
          pubKey: await keyStorage.getItem(`${userId}-prekey-${i}-pub`),
          privKey: await keyStorage.getItem(`${userId}-prekey-${i}-priv`)
        }
      });
    }
    
    // console.log("Retrieved ArrayBuffer Inspection:");
    // inspectArrayBuffer(keys.identityKeyPair.pubKey, "Retrieved Public Key");
    // inspectArrayBuffer(keys.identityKeyPair.privKey, "Retrieved Private Key");
    // inspectArrayBuffer(keys.signedPreKey.keyPair.pubKey, "Retrieved Signed PreKey Public");
    // inspectArrayBuffer(keys.signedPreKey.signature, "Retrieved Signature");
      
    return keys;
  } catch (error) {
    console.error("Error retrieving keys:", error);
    return null;
  }
}

/**
 * Deletes stored keys for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<void>}
 */
export async function deleteKeys(userId) {
  try {
    // Get all keys in storage
    const keys = await keyStorage.keys();
    
    // Delete all keys that start with userId
    for (const key of keys) {
      if (key.startsWith(userId) || key.startsWith(`${userId}-`)) {
        await keyStorage.removeItem(key);
      }
    }
    
    console.log(`Deleted all keys for user ${userId}`);
  } catch (error) {
    console.error("Error deleting keys:", error);
    throw error;
  }
}