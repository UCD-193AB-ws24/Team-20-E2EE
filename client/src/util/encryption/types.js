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
 * @property {number} registrationId - User's registration ID
 * @property {Object} identityPubKey - Public identity key
 * @property {number} signedPreKeyId - ID of the signed pre-key
 * @property {Object} signedPreKeyPub - Public signed pre-key
 * @property {ArrayBuffer} signedPreKeySignature - Signature of the signed pre-key
 * @property {Array<{keyId: number, pubKey: Object}>} preKeys - List of one-time pre-key public keys
 */

/**
 * @typedef {Object} KeyGenerationResult
 * @property {IdentityKeyPair} identityKeyPair - The user's identity key pair
 * @property {number} registrationId - The user's registration ID
 * @property {SignedPreKeyPair} signedPreKey - The user's signed pre-key
 * @property {Array<PreKeyPair>} preKeys - Array of one-time pre-keys
 */

export {};