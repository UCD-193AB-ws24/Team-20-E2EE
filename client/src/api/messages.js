import { BACKEND_URL } from '../config/config.js';
import fetchWithAuth from '../util/FetchWithAuth.jsx';
// Get chat history between current user and another user
export const getChatHistory = async (token, username) => {
  try {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/history?username=${username}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
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

export const getArchivedChatHistory = async (token, username) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/message/archive?username=${username}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
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
export const getAllMessagePreviews = async () => {
  try {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/previews`, {
      method: 'GET',
      headers: {
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

export const sendPrivateMessage = async (recipientUsername, text) => {
  try {
    console.log("recipientUsername:", recipientUsername);
    console.log("text:", text);
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipientUsername, text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  } catch (error) {
    console.error('Error sending message', error);
    return;
  }
};