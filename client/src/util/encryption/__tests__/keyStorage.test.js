import { storeKeys, getKeys, deleteKeys } from '../keyStorage';
import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';

describe('Key Storage', () => {
  // Sample user ID for testing
  const TEST_USER_ID = 'storage-test-user';
  let testKeys;
  
  // Generate test keys before all tests
  beforeAll(async () => {
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
    const preKey = await KeyHelper.generatePreKey(1);
    
    testKeys = {
      identityKeyPair,
      registrationId: 12345,
      signedPreKey,
      preKeys: [preKey]
    };
  });
  
  // Clean up after each test
  afterEach(async () => {
    await deleteKeys(TEST_USER_ID);
  });
  
  test('should store and retrieve keys', async () => {
    // Store keys
    await storeKeys(TEST_USER_ID, testKeys);
    
    // Retrieve keys
    const retrievedKeys = await getKeys(TEST_USER_ID);
    
    // Verify keys
    expect(retrievedKeys).toBeDefined();
    expect(retrievedKeys.registrationId).toBe(testKeys.registrationId);
    expect(retrievedKeys.preKeys.length).toBe(testKeys.preKeys.length);
  });
  
  test('should return null for non-existent user', async () => {
    const result = await getKeys('non-existent-user');
    expect(result).toBeNull();
  });
  
  test('should delete keys correctly', async () => {
    // Store keys
    await storeKeys(TEST_USER_ID, testKeys);
    
    // Verify keys exist
    const before = await getKeys(TEST_USER_ID);
    expect(before).toBeDefined();
    
    // Delete keys
    await deleteKeys(TEST_USER_ID);
    
    // Verify keys are deleted
    const after = await getKeys(TEST_USER_ID);
    expect(after).toBeNull();
  });
  
  test('should handle ArrayBuffers correctly', async () => {
    // Store keys
    await storeKeys(TEST_USER_ID, testKeys);
    
    // Retrieve keys
    const retrievedKeys = await getKeys(TEST_USER_ID);
    
    // Check if signature is properly serialized/deserialized
    expect(retrievedKeys.signedPreKey.signature instanceof ArrayBuffer).toBe(true);
    
    // Compare signature contents
    const originalBytes = new Uint8Array(testKeys.signedPreKey.signature);
    const retrievedBytes = new Uint8Array(retrievedKeys.signedPreKey.signature);
    
    expect(retrievedBytes.length).toBe(originalBytes.length);
  });
});