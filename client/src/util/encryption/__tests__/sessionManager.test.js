import { establishSession } from '../sessionManager';
import { createSignalProtocolStore } from '../signalStore';
import { getKeys } from '../keyStorage';

// Mock dependencies
jest.mock('@privacyresearch/libsignal-protocol-typescript', () => {
  // Create a mock processPreKey function that can be spied on
  const mockProcessPreKey = jest.fn().mockResolvedValue(undefined);
  
  return {
    SignalProtocolAddress: jest.fn().mockImplementation((name, deviceId) => ({
      getName: () => name,
      getDeviceId: () => deviceId
    })),
    SessionBuilder: jest.fn().mockImplementation(() => ({
      processPreKey: mockProcessPreKey
    })),
    SessionCipher: jest.fn()
  };
});

jest.mock('../keyStorage', () => ({
  getKeys: jest.fn()
}));

describe('Session Management', () => {
  // Sample data for testing
  const mockUserId = 'user123';
  const mockRecipientId = 'contact456';
  
  const mockLocalKeys = {
    uid: mockUserId,
    identityKeyPair: {
      pubKey: new Uint8Array([1, 2, 3]).buffer,
      privKey: new Uint8Array([4, 5, 6]).buffer
    },
    registrationId: 12345,
    signedPreKey: {
      keyId: 1,
      keyPair: {
        pubKey: new Uint8Array([7, 8, 9]).buffer,
        privKey: new Uint8Array([10, 11, 12]).buffer
      },
      signature: new Uint8Array([13, 14, 15]).buffer
    },
    preKeys: [{
      keyId: 1,
      keyPair: {
        pubKey: new Uint8Array([16, 17, 18]).buffer,
        privKey: new Uint8Array([19, 20, 21]).buffer
      }
    }]
  };
  
  const mockRecipientKeyBundle = {
    uid: mockRecipientId,
    deviceId: 1,
    registrationId: 67890,
    identityPubKey: 'AAEC', // Base64 of [1, 2, 3]
    signedPreKeyId: 1,
    signedPreKeyPub: 'BwgJ', // Base64 of [7, 8, 9]
    signedPreKeySignature: 'DQ4P', // Base64 of [13, 14, 15]
    preKeys: [{ keyId: 1, pubKey: 'EBIS' }] // Base64 of [16, 17, 18]
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Default mock implementation
    getKeys.mockResolvedValue(mockLocalKeys);
  });

  describe('establishSession', () => {
    it('should successfully establish a session with a recipient', async () => {
      // Arrange
      const { SignalProtocolAddress, SessionBuilder } = require('@privacyresearch/libsignal-protocol-typescript');
      // Access the mockImplementation directly
      const sessionBuilderInstance = new SessionBuilder();
      const processPreKeySpy = sessionBuilderInstance.processPreKey;

      // Act
      const result = await establishSession(mockUserId, mockRecipientId, mockRecipientKeyBundle);
      
      // Assert
      expect(result).toBe(true);
      expect(getKeys).toHaveBeenCalledWith(mockUserId);
      expect(SignalProtocolAddress).toHaveBeenCalledWith(mockRecipientId, mockRecipientKeyBundle.deviceId);
      expect(SessionBuilder).toHaveBeenCalled();
      expect(processPreKeySpy).toHaveBeenCalled();
    });

    it('should handle missing local keys', async () => {
      // Arrange
      getKeys.mockResolvedValue(null);
      
      // Act
      const result = await establishSession(mockUserId, mockRecipientId, mockRecipientKeyBundle);
      
      // Assert
      expect(result).toBe(false);
      expect(getKeys).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle errors during session establishment', async () => {
      // Arrange
      const { SessionBuilder } = require('@privacyresearch/libsignal-protocol-typescript');
      const sessionBuilderInstance = new SessionBuilder();
      const processPreKeySpy = sessionBuilderInstance.processPreKey;
      
      // Make processPreKey throw an error
      processPreKeySpy.mockRejectedValue(new Error('Test error'));
      
      // Act
      const result = await establishSession(mockUserId, mockRecipientId, mockRecipientKeyBundle);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createSignalProtocolStore', () => {
    it('should create a store with all required methods', async () => {
      // Act
      const store = await createSignalProtocolStore(mockUserId, mockLocalKeys);
      
      // Assert
      expect(store).toHaveProperty('getIdentityKeyPair');
      expect(store).toHaveProperty('getLocalRegistrationId');
      expect(store).toHaveProperty('saveIdentity');
      expect(store).toHaveProperty('isTrustedIdentity');
      expect(store).toHaveProperty('getIdentity');
      expect(store).toHaveProperty('loadSession');
      expect(store).toHaveProperty('storeSession');
      expect(store).toHaveProperty('loadPreKey');
      expect(store).toHaveProperty('storePreKey');
      expect(store).toHaveProperty('removePreKey');
      expect(store).toHaveProperty('loadSignedPreKey');
      expect(store).toHaveProperty('storeSignedPreKey');
      expect(store).toHaveProperty('removeSignedPreKey');
    });

    it('should properly initialize with provided keys', async () => {
      // Act
      const store = await createSignalProtocolStore(mockUserId, mockLocalKeys);
      
      // Assert
      const identityKeyPair = await store.getIdentityKeyPair();
      const registrationId = await store.getLocalRegistrationId();
      
      expect(identityKeyPair).toEqual(mockLocalKeys.identityKeyPair);
      expect(registrationId).toEqual(mockLocalKeys.registrationId);
    });

    it('should store and retrieve sessions', async () => {
      // Arrange
      const store = await createSignalProtocolStore(mockUserId, mockLocalKeys);
      const mockAddress = { getName: () => 'test', getDeviceId: () => 1 };
      const mockRecord = { someKey: 'someValue' };
      
      // Act
      await store.storeSession(mockAddress, mockRecord);
      const retrievedRecord = await store.loadSession(mockAddress);
      
      // Assert
      expect(retrievedRecord).toEqual(mockRecord);
    });

    it('should store and retrieve identity keys', async () => {
      // Arrange
      const store = await createSignalProtocolStore(mockUserId, mockLocalKeys);
      const mockAddress = { getName: () => 'test', getDeviceId: () => 1 };
      const mockPublicKey = new Uint8Array([1, 2, 3]).buffer;
      
      // Act
      await store.saveIdentity(mockAddress, mockPublicKey);
      const retrievedKey = await store.getIdentity(mockAddress);
      
      // Assert
      expect(retrievedKey).toEqual(mockPublicKey);
    });
  });
});