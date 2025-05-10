import { BACKEND_URL } from '../config/config.js';
import fetchWithAuth from '../util/FetchWithAuth';
// Local module cache
const avatarCache = {};
const DEFAULT_AVATAR_URL = '/images/default_avatar.jpg';

export const getAvatar = async (username) => {
  try {
    // Check if the avatar is already in cache
    if (avatarCache[username]) {
      return avatarCache[username];
    }

    // If not in cache, fetch from backend
    const response = await fetchWithAuth(`${BACKEND_URL}/api/user/get-avatar/${username}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.log(`Failed to fetch avatar: ${response.statusText}`);
      avatarCache[username] = DEFAULT_AVATAR_URL;
      return DEFAULT_AVATAR_URL;
    }

    console.log("Successfully fetched avatar.");

    // Create a blob URL that stays valid even after the response is consumed
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Add to cache
    avatarCache[username] = blobUrl;
    return blobUrl;
  } catch (error) {
    console.log('Error fetching avatar:', error);
    avatarCache[username] = DEFAULT_AVATAR_URL;
    return DEFAULT_AVATAR_URL;
  }
};