import { generateSignalProtocolKeys, createKeyBundle } from '../keyGeneration';
import { getKeys, deleteKeys } from '../keyStorage';

describe('Signal Protocol Key Generation', () => {
  // Generate a unique user ID for each test
  const TEST_USER_ID = `test-user-${Date.now()}`;
  
  // Clean up after tests
  afterEach(async () => {
    await deleteKeys(TEST_USER_ID);
  });

  test('should generate a complete set of keys', async () => {
    // Generate keys
    const keys = await generateSignalProtocolKeys(TEST_USER_ID);
    
    // Verify key structure
    expect(keys).toBeDefined();
    expect(keys.identityKeyPair).toBeDefined();
    expect(keys.identityKeyPair.pubKey).toBeDefined();
    expect(keys.identityKeyPair.privKey).toBeDefined();
    expect(keys.registrationId).toBeDefined();
    expect(typeof keys.registrationId).toBe('number');
    expect(keys.signedPreKey).toBeDefined();
    expect(keys.signedPreKey.signature).toBeDefined();
    expect(keys.signedPreKey.keyId).toBe(1);
    expect(keys.preKeys.length).toBe(100); // Based on your PRE_KEY_COUNT
    expect(keys.preKeys[0].keyId).toBe(1); // Based on your STARTING_PRE_KEY_ID
  });

  test('should store and retrieve keys correctly', async () => {
    // Generate and store keys
    const originalKeys = await generateSignalProtocolKeys(TEST_USER_ID);
    
    // Retrieve keys
    const retrievedKeys = await getKeys(TEST_USER_ID);
    
    // Verify keys match
    expect(retrievedKeys).toBeDefined();
    expect(retrievedKeys.registrationId).toBe(originalKeys.registrationId);
    expect(retrievedKeys.preKeys.length).toBe(originalKeys.preKeys.length);
    
    // Check that ArrayBuffers were properly serialized/deserialized
    expect(retrievedKeys.signedPreKey.signature instanceof ArrayBuffer).toBe(true);
  });

  test('createKeyBundle should extract only public keys', async () => {
    // Generate keys
    const keys = await generateSignalProtocolKeys(TEST_USER_ID);
    
    // Create key bundle
    const bundle = createKeyBundle(keys);
    
    // Verify bundle structure
    expect(bundle.registrationId).toBe(keys.registrationId);
    expect(bundle.identityPubKey).toBeDefined();
    expect(bundle.signedPreKeyId).toBe(1);
    expect(bundle.signedPreKeyPub).toBeDefined();
    expect(typeof bundle.signedPreKeySignature).toBe('string');
    expect(bundle.preKeys.length).toBe(100);
    
    // Ensure no private keys are included
    const bundleString = JSON.stringify(bundle, (key, value) => {
      if (value instanceof ArrayBuffer) return 'ArrayBuffer';
      return value;
    });
    expect(bundleString).not.toContain('privKey');
  });

  test('should handle unique user IDs separately', async () => {
    // Generate keys for two different users
    const userId1 = 'test-user-1';
    const userId2 = 'test-user-2';
    
    const keys1 = await generateSignalProtocolKeys(userId1);
    const keys2 = await generateSignalProtocolKeys(userId2);
    
    // Verify keys are different
    expect(keys1.registrationId).not.toBe(keys2.registrationId);
    
    // Clean up
    await deleteKeys(userId1);
    await deleteKeys(userId2);
  });
});