import { Direction } from '@privacyresearch/libsignal-protocol-typescript';

/**
 * Creates a Signal Protocol store with the required methods
 * @param {string} userId - User ID for whom the store is created
 * @param {import('./types').KeyGenerationResult} keys - User's keys
 * @returns {Promise<Object>} - A store compatible with Signal Protocol library
 */
export async function createSignalProtocolStore(userId, keys) {
  // In-memory storage
  const sessions = {};
  const identityKeys = {};
  const preKeys = {};
  const signedPreKeys = {};
  
  // Store our identity key
  identityKeys[userId] = {
    pub: keys.identityKeyPair.pubKey,
    priv: keys.identityKeyPair.privKey
  };
  
  // Store our pre-keys
  keys.preKeys.forEach(pk => {
    preKeys[pk.keyId] = {
      keyPair: pk.keyPair
    };
  });
  
  // Store our signed prekey
  signedPreKeys[keys.signedPreKey.keyId] = {
    keyPair: keys.signedPreKey.keyPair,
    signature: keys.signedPreKey.signature
  };
  
  // Create store with required methods
  return {
    // Identity Key methods
    getIdentityKeyPair: async () => {
      console.log('Getting identity key pair for', userId);
      return keys.identityKeyPair;
    },
    getLocalRegistrationId: async () => {
      return keys.registrationId;
    },
    saveIdentity: async (address, publicKey) => {
      console.log(`Saving identity for ${address.getName()}:${address.getDeviceId()}`);
      const id = address.getName();
      identityKeys[id] = publicKey;
      return true;
    },
    isTrustedIdentity: async (address, publicKey, direction) => {
      // For simplicity, always trust on first use
      // In a production app, you'd implement proper identity key verification
      console.log(`Checking trust for ${address.getName()}:${address.getDeviceId()}`);
      return true;
    },
    getIdentity: async (address) => {
      const id = address.getName();
      console.log(`Getting identity for ${id}`);
      if (id === userId) {
        return keys.identityKeyPair.pubKey;
      }
      return identityKeys[id] || null;
    },
    
    // Session methods
    loadSession: async (address) => {
      const id = `${address.getName()}:${address.getDeviceId()}`;
      console.log(`Loading session for ${id}`);
      return sessions[id] || null;
    },
    storeSession: async (address, record) => {
      const id = `${address.getName()}:${address.getDeviceId()}`;
      console.log(`Storing session for ${id}`);
      sessions[id] = record;
      return true;
    },
    
    // PreKey methods
    loadPreKey: async (keyId) => {
      console.log(`Loading prekey ${keyId}`);
      return preKeys[keyId] ? preKeys[keyId].keyPair : null;
    },
    storePreKey: async (keyId, keyPair) => {
      console.log(`Storing prekey ${keyId}`);
      preKeys[keyId] = { keyPair };
      return true;
    },
    removePreKey: async (keyId) => {
      console.log(`Removing prekey ${keyId}`);
      delete preKeys[keyId];
    },
    
    // Signed PreKey methods
    loadSignedPreKey: async (keyId) => {
      console.log(`Loading signed prekey ${keyId}`);
      return signedPreKeys[keyId] ? signedPreKeys[keyId].keyPair : null;
    },
    storeSignedPreKey: async (keyId, keyPair) => {
      console.log(`Storing signed prekey ${keyId}`);
      signedPreKeys[keyId] = { keyPair };
      return true;
    },
    removeSignedPreKey: async (keyId) => {
      console.log(`Removing signed prekey ${keyId}`);
      delete signedPreKeys[keyId];
    }
  };
}