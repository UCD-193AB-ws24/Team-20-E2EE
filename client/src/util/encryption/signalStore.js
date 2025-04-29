import { Direction } from '@privacyresearch/libsignal-protocol-typescript';

/**
 * Convert ArrayBuffer to Base64 string.
 */
function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Convert Base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Ensure input is properly Base64-encoded string.
 */
function ensureBase64(input) {
  if (typeof input === 'string') return input;
  if (input instanceof ArrayBuffer) return arrayBufferToBase64(input);
  if (input instanceof Uint8Array) return arrayBufferToBase64(input.buffer);
  throw new Error('Invalid input type for Base64 encoding');
}

/**
 * Create a Signal Protocol store backed by localStorage.
 * @param {string} userId
 * @param {Object} keys
 * @returns {Promise<Object>}
 */
export async function createSignalProtocolStore(userId, keys) {
  const PREFIX = `${userId}_signal_store`;
  const SESSION_KEY = `${PREFIX}_sessions`;
  const IDENTITY_KEY = `${PREFIX}_identityKeys`;
  const PREKEYS_KEY = `${PREFIX}_preKeys`;
  const SIGNED_PREKEYS_KEY = `${PREFIX}_signedPreKeys`;

  function load(key) {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : {};
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getSessionKey(address) {
    if (typeof address === "string") {
      // Already session key
      return address;
    }
    return `${address.getName()}:${address.getDeviceId()}`;
  }

  // Initialize if not present
  const identityData = load(IDENTITY_KEY);
  if (!identityData[userId]) {
    identityData[userId] = {
      pub: ensureBase64(keys.identityKeyPair.pubKey),
      priv: ensureBase64(keys.identityKeyPair.privKey)
    };
    save(IDENTITY_KEY, identityData);
  }

  const preKeysData = load(PREKEYS_KEY);
  if (Object.keys(preKeysData).length === 0) {
    const preKeyObj = {};
    keys.preKeys.forEach(pk => {
      preKeyObj[pk.keyId] = {
        pubKey: ensureBase64(pk.keyPair.pubKey),
        privKey: ensureBase64(pk.keyPair.privKey)
      };
    });
    save(PREKEYS_KEY, preKeyObj);
  }

  const signedPreKeysData = load(SIGNED_PREKEYS_KEY);
  if (Object.keys(signedPreKeysData).length === 0) {
    signedPreKeysData[keys.signedPreKey.keyId] = {
      pubKey: ensureBase64(keys.signedPreKey.keyPair.pubKey),
      privKey: ensureBase64(keys.signedPreKey.keyPair.privKey),
      signature: ensureBase64(keys.signedPreKey.signature)
    };
    save(SIGNED_PREKEYS_KEY, signedPreKeysData);
  }

  return {
    // Identity
    getIdentityKeyPair: async () => {
      const identities = load(IDENTITY_KEY);
      const key = identities[userId];
      return {
        pubKey: base64ToArrayBuffer(key.pub),
        privKey: base64ToArrayBuffer(key.priv)
      };
    },

    getLocalRegistrationId: async () => {
      return keys.registrationId;
    },

    saveIdentity: async (address, publicKey) => {
      const id = typeof address === 'string' ? address : address.getName();
      const identities = load(IDENTITY_KEY);
      identities[id] = ensureBase64(publicKey);
      save(IDENTITY_KEY, identities);
      console.log(`Saved identity for ${id}`);
      return true;
    },

    getIdentity: async (address) => {
      const id = typeof address === 'string' ? address : address.getName();
      const identities = load(IDENTITY_KEY);
      if (!identities[id]) return null;
      return base64ToArrayBuffer(identities[id]);
    },

    isTrustedIdentity: async (address, publicKey, direction) => {
      const id = typeof address === 'string' ? address : address.getName();
      const identities = load(IDENTITY_KEY);
      const trusted = identities[id];
      if (!trusted) return true; // first time seeing, trust
      const trustedBuffer = base64ToArrayBuffer(trusted);
      return arrayBufferToBase64(trustedBuffer) === arrayBufferToBase64(publicKey);
    },

    // Sessions
    loadSession: async (address) => {
      const sessions = load(SESSION_KEY);
      const id = getSessionKey(address);
      const record = sessions[id];
      return record !== undefined ? record : undefined;
    },

    storeSession: async (address, record) => {
      const sessions = load(SESSION_KEY);
      const id = getSessionKey(address);
      sessions[id] = record;
      save(SESSION_KEY, sessions);
      console.log(`Stored session for ${id}`);
      return true;
    },

    // PreKeys
    loadPreKey: async (keyId) => {
      const preKeys = load(PREKEYS_KEY);
      const preKey = preKeys[keyId];
      return preKey ? {
        pubKey: base64ToArrayBuffer(preKey.pubKey),
        privKey: base64ToArrayBuffer(preKey.privKey)
      } : null;
    },

    storePreKey: async (keyId, keyPair) => {
      const preKeys = load(PREKEYS_KEY);
      preKeys[keyId] = {
        pubKey: ensureBase64(keyPair.pubKey),
        privKey: ensureBase64(keyPair.privKey)
      };
      save(PREKEYS_KEY, preKeys);
      console.log(`Stored prekey ${keyId}`);
      return true;
    },

    removePreKey: async (keyId) => {
      const preKeys = load(PREKEYS_KEY);
      delete preKeys[keyId];
      save(PREKEYS_KEY, preKeys);
      console.log(`Removed prekey ${keyId}`);
      return true;
    },

    // Signed PreKeys
    loadSignedPreKey: async (keyId) => {
      const signedPreKeys = load(SIGNED_PREKEYS_KEY);
      const signedPreKey = signedPreKeys[keyId];
      return signedPreKey ? {
        pubKey: base64ToArrayBuffer(signedPreKey.pubKey),
        privKey: base64ToArrayBuffer(signedPreKey.privKey)
      } : null;
    },

    storeSignedPreKey: async (keyId, keyPair) => {
      const signedPreKeys = load(SIGNED_PREKEYS_KEY);
      signedPreKeys[keyId] = {
        pubKey: ensureBase64(keyPair.pubKey),
        privKey: ensureBase64(keyPair.privKey)
      };
      save(SIGNED_PREKEYS_KEY, signedPreKeys);
      console.log(`Stored signed prekey ${keyId}`);
      return true;
    },

    removeSignedPreKey: async (keyId) => {
      const signedPreKeys = load(SIGNED_PREKEYS_KEY);
      delete signedPreKeys[keyId];
      save(SIGNED_PREKEYS_KEY, signedPreKeys);
      console.log(`Removed signed prekey ${keyId}`);
      return true;
    }
  };
}
