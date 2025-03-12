import { BACKEND_URL } from '../config/config.js';

// Get authenticated user's friend list
export const getFriendList = async (token) => {
  const response = await fetch(`${BACKEND_URL}/api/user/friendList`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch friend list');
  }
  
  return response.json();
};

// Get all friend requests for authenticated user
export const getFriendRequests = async (token) => {
  const response = await fetch(`${BACKEND_URL}/api/user/friendRequestList`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch friend requests');
  }
  
  return response.json();
};

// Send a friend request to a user
export const sendFriendRequest = async (token, friendUsername) => {
  const response = await fetch(`${BACKEND_URL}/api/user/send-friend-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendUsername }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send friend request');
  }
  
  return response.json();
};

// Accept a friend request
export const acceptFriendRequest = async (token, friendUsername) => {
  const response = await fetch(`${BACKEND_URL}/api/user/accept-friend-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendUsername }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept friend request');
  }
  
  return response.json();
};

// Delete/decline a friend request
export const deleteFriendRequest = async (token, friendUsername) => {
  const response = await fetch(`${BACKEND_URL}/api/user/delete-friend-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendUsername }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete friend request');
  }
  
  return response.json();
};

// Remove a user from friends list
export const unfriendUser = async (token, friendUsername) => {
  const response = await fetch(`${BACKEND_URL}/api/user/unfriend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendUsername }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unfriend user');
  }
  
  return response.json();
};

// Search for users by username
export const searchUsers = async (query) => {
  const response = await fetch(`${BACKEND_URL}/api/user/searchUser?username=${query}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search users');
  }
  
  return response.json();
};