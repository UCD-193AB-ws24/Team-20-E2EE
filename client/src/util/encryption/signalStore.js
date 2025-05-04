import { Direction } from '@privacyresearch/libsignal-protocol-typescript';

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// IndexedDB helpers
const DB_NAME = "SignalProtocolStore";
const DB_VERSION = 1;
const STORE_NAMES = ["identities", "sessions", "preKeys", "signedPreKeys"];

async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORE_NAMES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(storeName, key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Main Signal Protocol store
/**
 * Create a Signal Protocol store backed by IndexedDB that stores ArrayBuffers directly.
 * @param {string} userId
 * @param {Object} keys
 * @returns {Promise<Object>}
 */
export async function createSignalProtocolStore(userId, keys) {
  function getSessionKey(address) {
    if (typeof address === "string") return address;
    return `${address.getName()}:${address.getDeviceId()}`;
  }

  // Initialize identities, prekeys, signed prekeys if needed
  if (!(await idbGet("identities", userId))) {
    await idbPut("identities", userId, {
      pub: (keys.identityKeyPair.pubKey),
      priv: (keys.identityKeyPair.privKey)
    });
  }

  if (!(await idbGet("preKeys", keys.preKeys[0].keyId))) {
    for (const preKey of keys.preKeys) {
      await idbPut("preKeys", preKey.keyId, {
        pubKey: (preKey.keyPair.pubKey),
        privKey: (preKey.keyPair.privKey)
      });
    }
  }

  if (!(await idbGet("signedPreKeys", keys.signedPreKey.keyId))) {
    await idbPut("signedPreKeys", keys.signedPreKey.keyId, {
      pubKey: (keys.signedPreKey.keyPair.pubKey),
      privKey: (keys.signedPreKey.keyPair.privKey),
      signature: (keys.signedPreKey.signature)
    });
  }

  return {
    // Identity
    getIdentityKeyPair: async () => {
      const key = await idbGet("identities", userId);
      return {
        pubKey: key.pub,  // Already ArrayBuffer
        privKey: key.priv // Already ArrayBuffer
      };
    },

    getLocalRegistrationId: async () => keys.registrationId,

    saveIdentity: async (address, publicKey) => {
      const id = typeof address === 'string' ? address : address.getName();
      await idbPut("identities", id, (publicKey));
      console.log(`Saved identity for ${id}`);
    },

    getIdentity: async (address) => {
      const id = typeof address === 'string' ? address : address.getName();
      return await idbGet("identities", id); // Return directly (already ArrayBuffer)
    },

    isTrustedIdentity: async (address, publicKey, direction) => {
      const id = typeof address === 'string' ? address : address.getName();
      const trusted = await idbGet("identities", id);
      if (!trusted) return true;
      
      // Compare ArrayBuffers directly
      const publicKeyBuffer = (publicKey);
      if (trusted.byteLength !== publicKeyBuffer.byteLength) return false;
      
      const trustedArray = new Uint8Array(trusted);
      const publicKeyArray = new Uint8Array(publicKeyBuffer);
      
      for (let i = 0; i < trustedArray.length; i++) {
        if (trustedArray[i] !== publicKeyArray[i]) return false;
      }
      return true;
    },

    // Sessions
    loadSession: async (address) => {
      const id = getSessionKey(address);
      return await idbGet("sessions", id);
    },

    storeSession: async (address, record) => {
      const id = getSessionKey(address);
      await idbPut("sessions", id, record); // Store directly, no conversion
      console.log(`Stored session for ${id}`);
    },

    // PreKeys
    loadPreKey: async (keyId) => {
      const preKey = await idbGet("preKeys", keyId);
      if (!preKey) return null;
      
      return {
        pubKey: preKey.pubKey, // Already ArrayBuffer
        privKey: preKey.privKey // Already ArrayBuffer
      };
    },

    storePreKey: async (keyId, keyPair) => {
      await idbPut("preKeys", keyId, {
        pubKey: (keyPair.pubKey),
        privKey: (keyPair.privKey)
      });
      console.log(`Stored prekey ${keyId}`);
    },

    removePreKey: async (keyId) => {
      await idbDelete("preKeys", keyId);
      console.log(`Removed prekey ${keyId}`);
    },

    // Signed PreKeys
    loadSignedPreKey: async (keyId) => {
      const signedPreKey = await idbGet("signedPreKeys", keyId);
      if (!signedPreKey) return null;
      
      return {
        pubKey: signedPreKey.pubKey, // Already ArrayBuffer
        privKey: signedPreKey.privKey // Already ArrayBuffer
      };
    },

    storeSignedPreKey: async (keyId, keyPair) => {
      await idbPut("signedPreKeys", keyId, {
        pubKey: (keyPair.pubKey),
        privKey: (keyPair.privKey)
      });
      console.log(`Stored signed prekey ${keyId}`);
    },

    removeSignedPreKey: async (keyId) => {
      await idbDelete("signedPreKeys", keyId);
      console.log(`Removed signed prekey ${keyId}`);
    }
  };
}
