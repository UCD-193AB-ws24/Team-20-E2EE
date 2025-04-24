import { BACKEND_URL } from "../config/config";
import { getDeviceId } from "../util/deviceId";

// Upload the user's key bundle to the server
export const uploadKeyBundle = async (keyBundle, forceOverwrite) => {
  try {
    // Convert ArrayBuffer to base64 for JSON transport
    const bundle = { ...keyBundle, forceOverwrite };

    const response = await fetch(`${BACKEND_URL}/api/keys/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bundle),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload key bundle');
    }

    return { success: true };
  } catch (error) {
    console.error('Error uploading key bundle:', error);
    return { success: false, error: error.message };
  }
};

// Retrieve another user's key bundle
export const fetchKeyBundle = async (username) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/keys/${username}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch key bundle');
    }

    // Convert base64 signature back to ArrayBuffer
    if (typeof data.keyBundle.signedPreKeySignature === 'string') {
      const binary = atob(data.keyBundle.signedPreKeySignature);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      data.keyBundle.signedPreKeySignature = bytes.buffer;
    }

    return { success: true, keyBundle: data.keyBundle };
  } catch (error) {
    console.error('Error fetching key bundle:', error);
    return { success: false, error: error.message };
  }
};

// Check if a key bundle exists for the current device
export const checkKeyBundle = async () => {
  try {
    const deviceId = getDeviceId();
    const response = await fetch(`${BACKEND_URL}/api/keys/check?deviceId=${deviceId}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to check key bundle status');
    }

    return { success: true, needsKeyBundle: data.needsKeyBundle };
  } catch (error) {
    console.error('Error checking key bundle status:', error);
    // Default to generating a new key bundle on error
    return { success: false, needsKeyBundle: true, error: error.message };
  }
};

export const checkDeviceKeyConsistency = async () => {
    try {
      const deviceId = getDeviceId();
      const response = await fetch(`${BACKEND_URL}/api/keys/device-check?deviceId=${deviceId}`, {
        method: 'GET',
        credentials: 'include',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check device key consistency');
      }
  
      const data = await response.json();
      return { 
        hasKeysOnServer: data.hasKeysOnServer,
        success: true 
      };
    } catch (error) {
      console.error('Error checking device key consistency:', error);
      // If we can't check, assume keys don't exist to be safe
      return { hasKeysOnServer: false, success: false };
    }
  };