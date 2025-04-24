import { generateSignalProtocolKeys, createKeyBundle } from './keyGeneration';
import { getKeys } from './keyStorage';
import { uploadKeyBundle } from '../../api/keyBundle';

/**
 * Sets up encryption for a user after login
 * Checks if keys exist, generates them if needed, and uploads the key bundle
 * @param {string} userId - User's ID to associate with keys
 * @returns {Promise<boolean>} - True if setup was successful
 */
export const setupUserEncryption = async (userId) => {
  try {
    // First check if keys already exist for this user
    const existingKeys = await getKeys(userId);
    
    if (existingKeys) {
      console.log('Encryption keys already exist for this user');
      return true;
    }
    
    console.log('Generating new encryption keys...');
    // Generate new keys for the user
    const keys = await generateSignalProtocolKeys(userId);
    
    // Create a key bundle for the server
    const keyBundle = createKeyBundle(keys);
    
    // Upload the key bundle to the server
    const result = await uploadKeyBundle(keyBundle);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to upload key bundle');
    }
    
    console.log('Encryption setup complete');
    return true;
  } catch (error) {
    console.error('Failed to set up encryption:', error);
    return false;
  }
};