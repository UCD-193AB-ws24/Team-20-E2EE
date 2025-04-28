import { Direction } from '@privacyresearch/libsignal-protocol-typescript';

/**
 * Creates a Signal Protocol store backed by localStorage
 * @param {string} userId - User ID for whom the store is created
 * @param {import('./types').KeyGenerationResult} keys - User's keys
 * @returns {Promise<Object>} - A store compatible with Signal Protocol library
 */
export async function createSignalProtocolStore(userId, keys) {
  const SESSIONS_KEY = `${userId}_sessions`;
  const IDENTITY_KEY = `${userId}_identityKeys`;
  const PREKEYS_KEY = `${userId}_preKeys`;
  const SIGNED_PREKEYS_KEY = `${userId}_signedPreKeys`;

  function load(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  function save(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  // Initialize localStorage if not already
  if (!localStorage.getItem(IDENTITY_KEY)) {
    save(IDENTITY_KEY, {
      [userId]: {
        pub: keys.identityKeyPair.pubKey,
        priv: keys.identityKeyPair.privKey
      }
    });
  }

  if (!localStorage.getItem(PREKEYS_KEY)) {
    const preKeyObj = {};
    keys.preKeys.forEach(pk => {
      preKeyObj[pk.keyId] = { keyPair: pk.keyPair };
    });
    save(PREKEYS_KEY, preKeyObj);
  }

  if (!localStorage.getItem(SIGNED_PREKEYS_KEY)) {
    save(SIGNED_PREKEYS_KEY, {
      [keys.signedPreKey.keyId]: {
        keyPair: keys.signedPreKey.keyPair,
        signature: keys.signedPreKey.signature
      }
    });
  }

  return {
    getIdentityKeyPair: async () => {
      console.log('Getting identity key pair for', userId);
      const identityKeys = load(IDENTITY_KEY);
      return identityKeys[userId];
    },
    getLocalRegistrationId: async () => {
      return keys.registrationId;
    },
    saveIdentity: async (address, publicKey) => {
      const id = address; // address is a string!
      const identityKeys = load(IDENTITY_KEY);
      identityKeys[id] = publicKey;
      save(IDENTITY_KEY, identityKeys);
      console.log(`Saved identity for ${id}`);
      return true;
    },
    isTrustedIdentity: async (address, publicKey, direction) => {
      console.log(`Trusting identity for ${address}`);
      // Here, address is a simple string like "recipientId:deviceId"
      return true; // For now, blindly trusting first time
    },
    getIdentity: async (address) => {
      const id = address; // address is a string!
      const identityKeys = load(IDENTITY_KEY);
      console.log(`Getting identity for ${id}`);
      return identityKeys[id] || null;
    },

    loadSession: async (address) => {
      const id = `${address.getName()}:${address.getDeviceId()}`;
      const sessions = load(SESSIONS_KEY);
      console.log(`Loading session for ${id}`);
      return sessions[id] || null;
    },
    storeSession: async (address, record) => {
      const id = `${address.getName()}:${address.getDeviceId()}`;
      const sessions = load(SESSIONS_KEY);
      sessions[id] = record;
      save(SESSIONS_KEY, sessions);
      console.log(`Stored session for ${id}`);
      return true;
    },

    loadPreKey: async (keyId) => {
      const preKeys = load(PREKEYS_KEY);
      console.log(`Loading prekey ${keyId}`);
      return preKeys[keyId] ? preKeys[keyId].keyPair : null;
    },
    storePreKey: async (keyId, keyPair) => {
      const preKeys = load(PREKEYS_KEY);
      preKeys[keyId] = { keyPair };
      save(PREKEYS_KEY, preKeys);
      console.log(`Stored prekey ${keyId}`);
      return true;
    },
    removePreKey: async (keyId) => {
      const preKeys = load(PREKEYS_KEY);
      delete preKeys[keyId];
      save(PREKEYS_KEY, preKeys);
      console.log(`Removed prekey ${keyId}`);
    },

    loadSignedPreKey: async (keyId) => {
      const signedPreKeys = load(SIGNED_PREKEYS_KEY);
      console.log(`Loading signed prekey ${keyId}`);
      return signedPreKeys[keyId] ? signedPreKeys[keyId].keyPair : null;
    },
    storeSignedPreKey: async (keyId, keyPair) => {
      const signedPreKeys = load(SIGNED_PREKEYS_KEY);
      signedPreKeys[keyId] = { keyPair };
      save(SIGNED_PREKEYS_KEY, signedPreKeys);
      console.log(`Stored signed prekey ${keyId}`);
      return true;
    },
    removeSignedPreKey: async (keyId) => {
      const signedPreKeys = load(SIGNED_PREKEYS_KEY);
      delete signedPreKeys[keyId];
      save(SIGNED_PREKEYS_KEY, signedPreKeys);
      console.log(`Removed signed prekey ${keyId}`);
    }
  };
}
