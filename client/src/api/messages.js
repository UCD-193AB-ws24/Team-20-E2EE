import { BACKEND_URL } from '../config/config.js';

// Get chat history between current user and another user
export const getChatHistory = async (token, username) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/message/history?username=${username}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chat history');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return { messages: [] };
  }
};

// Get message previews for all friends
export const getAllMessagePreviews = async (token) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/message/previews`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch message previews');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching message previews:', error);
    return { previews: [] };
  }
};