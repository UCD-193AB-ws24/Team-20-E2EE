/**
 * @typedef {Object} IdentityKeyPair
 * @property {Object} pubKey - Public identity key
 * @property {Object} privKey - Private identity key
 */

/**
 * @typedef {Object} SignedPreKeyPair
 * @property {number} keyId - Numeric identifier for this key
 * @property {Object} keyPair - The pre-key pair containing public and private keys
 * @property {ArrayBuffer} signature - Signature created with identity key
 */

/**
 * @typedef {Object} PreKeyPair
 * @property {number} keyId - Numeric identifier for this key
 * @property {Object} keyPair - The one-time pre-key pair
 */

/**
 * @typedef {Object} KeyBundle
 * @property {string} uid - User ID
 * @property {string} deviceId - Device ID
 * @property {number} registrationId - User's registration ID
 * @property {string} identityPubKey - Public identity key
 * @property {number} signedPreKeyId - ID of the signed pre-key
 * @property {string} signedPreKeyPub - Public signed pre-key
 * @property {string} signedPreKeySignature - Signature of the signed pre-key
 * @property {Array<{keyId: number, pubKey: Object}>} preKeys - List of one-time pre-key public keys
 */

/**
 * @typedef {Object} KeyGenerationResult
 * @property {string} uid - User ID associated with these keys
 * @property {IdentityKeyPair} identityKeyPair - The user's identity key pair
 * @property {number} registrationId - The user's registration ID
 * @property {SignedPreKeyPair} signedPreKey - The user's signed pre-key
 * @property {Array<PreKeyPair>} preKeys - Array of one-time pre-keys
 */

/**
 * @typedef {Object} SessionInfo
 * @property {string} recipientId - ID of the message recipient
 * @property {number} deviceId - Device ID of the recipient
 * @property {boolean} established - Whether the session has been established
 */

/**
 * @typedef {Object} RecipientKeyBundle
 * @property {string} uid - User ID of the recipient
 * @property {string} deviceId - Device ID of the recipient
 * @property {number} registrationId - Registration ID
 * @property {string} identityPubKey - Base64 encoded identity public key
 * @property {number} signedPreKeyId - ID of the signed pre-key
 * @property {string} signedPreKeyPub - Base64 encoded signed pre-key
 * @property {string} signedPreKeySignature - Base64 encoded signature
 * @property {Array<{keyId: number, pubKey: string}>} preKeys - Array of available pre-keys
 */

export {};