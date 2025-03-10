import { BACKEND_URL } from '../config/config.js';

// Get chat history between current user and another user
export const getChatHistory = async (token, username) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/message/history?username=${username}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chat history');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};