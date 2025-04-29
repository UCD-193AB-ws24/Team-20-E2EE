import { Direction } from '@privacyresearch/libsignal-protocol-typescript';

// ArrayBuffer <-> Base64 helpers
function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function ensureBase64(input) {
  if (typeof input === 'string') return input;
  if (input instanceof ArrayBuffer) return arrayBufferToBase64(input);
  if (input instanceof Uint8Array) return arrayBufferToBase64(input.buffer);
  throw new Error('Invalid input type for Base64 encoding');
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
 * Create a Signal Protocol store backed by localStorage.
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
      pub: ensureBase64(keys.identityKeyPair.pubKey),
      priv: ensureBase64(keys.identityKeyPair.privKey)
    });
  }

  if (!(await idbGet("preKeys", keys.preKeys[0].keyId))) {
    for (const preKey of keys.preKeys) {
      await idbPut("preKeys", preKey.keyId, {
        pubKey: ensureBase64(preKey.keyPair.pubKey),
        privKey: ensureBase64(preKey.keyPair.privKey)
      });
    }
  }

  if (!(await idbGet("signedPreKeys", keys.signedPreKey.keyId))) {
    await idbPut("signedPreKeys", keys.signedPreKey.keyId, {
      pubKey: ensureBase64(keys.signedPreKey.keyPair.pubKey),
      privKey: ensureBase64(keys.signedPreKey.keyPair.privKey),
      signature: ensureBase64(keys.signedPreKey.signature)
    });
  }

  return {
    // Identity
    getIdentityKeyPair: async () => {
      const key = await idbGet("identities", userId);
      return {
        pubKey: base64ToArrayBuffer(key.pub),
        privKey: base64ToArrayBuffer(key.priv)
      };
    },

    getLocalRegistrationId: async () => keys.registrationId,

    saveIdentity: async (address, publicKey) => {
      const id = typeof address === 'string' ? address : address.getName();
      await idbPut("identities", id, ensureBase64(publicKey));
      console.log(`Saved identity for ${id}`);
    },

    getIdentity: async (address) => {
      const id = typeof address === 'string' ? address : address.getName();
      const stored = await idbGet("identities", id);
      if (!stored) return null;
      return base64ToArrayBuffer(stored);
    },

    isTrustedIdentity: async (address, publicKey, direction) => {
      const id = typeof address === 'string' ? address : address.getName();
      const trusted = await idbGet("identities", id);
      if (!trusted) return true;
      const trustedBuffer = base64ToArrayBuffer(trusted);
      return arrayBufferToBase64(trustedBuffer) === arrayBufferToBase64(publicKey);
    },

    // Sessions
    loadSession: async (address) => {
      const id = getSessionKey(address);
      return await idbGet("sessions", id);
    },

    storeSession: async (address, record) => {
      const id = getSessionKey(address);
      await idbPut("sessions", id, record);
      console.log(`Stored session for ${id}`);
    },

    // PreKeys
    loadPreKey: async (keyId) => {
      const preKey = await idbGet("preKeys", keyId);
      return preKey ? {
        pubKey: base64ToArrayBuffer(preKey.pubKey),
        privKey: base64ToArrayBuffer(preKey.privKey)
      } : null;
    },

    storePreKey: async (keyId, keyPair) => {
      await idbPut("preKeys", keyId, {
        pubKey: ensureBase64(keyPair.pubKey),
        privKey: ensureBase64(keyPair.privKey)
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
      return signedPreKey ? {
        pubKey: base64ToArrayBuffer(signedPreKey.pubKey),
        privKey: base64ToArrayBuffer(signedPreKey.privKey)
      } : null;
    },

    storeSignedPreKey: async (keyId, keyPair) => {
      await idbPut("signedPreKeys", keyId, {
        pubKey: ensureBase64(keyPair.pubKey),
        privKey: ensureBase64(keyPair.privKey)
      });
      console.log(`Stored signed prekey ${keyId}`);
    },

    removeSignedPreKey: async (keyId) => {
      await idbDelete("signedPreKeys", keyId);
      console.log(`Removed signed prekey ${keyId}`);
    }
  };
}
