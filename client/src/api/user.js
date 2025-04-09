import { BACKEND_URL } from '../config/config.js';

// Local module cache
const avatarCache = {};

export const getAvatar = async (username) => {
  try {
    // Check if the avatar is already in cache
    if (avatarCache[username]) {
      return avatarCache[username];
    }

    // If not in cache, fetch from backend
    const response = await fetch(`${BACKEND_URL}/api/user/get-avatar/${username}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch avatar: ${response.statusText}`);
    }

    // Create a blob URL that stays valid even after the response is consumed
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Add to cache
    avatarCache[username] = blobUrl;
    return blobUrl;
  } catch (error) {
    console.error('Error fetching avatar:', error);
    throw error;
  }
};