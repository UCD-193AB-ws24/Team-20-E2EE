import { BACKEND_URL } from '../config/config.js';

export const getAvatar = async (username) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/user/get-avatar/${username}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch avatar: ${response.statusText}`);
    }

    return response.url;
  } catch (error) {
    console.error('Error fetching avatar:', error);
    throw error;
  }
};