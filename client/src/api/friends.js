import { BACKEND_URL } from '../config/config.js';
import fetchWithAuth from '../util/FetchWithAuth.jsx';
// Get authenticated user's friend list
export const getFriendList = async () => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/friendList`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch friend list');
  }
  const data = response.json();
  
  return data;
};

// Get all friend requests for authenticated user
export const getFriendRequests = async () => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/friendRequestList`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch friend requests');
  }
  
  return response.json();
};

// Send a friend request to a user
export const sendFriendRequest = async (recipientUsername) => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/send-friend-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipientUsername }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send friend request');
  }
  
  return response.json();
};

// Accept a friend request
export const acceptFriendRequest = async (friendUsername) => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/accept-friend-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
export const deleteFriendRequest = async (friendUsername) => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/delete-friend-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
export const unfriendUser = async (friendUsername) => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/unfriend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/searchUser?username=${query}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search users');
  }
  const data = await response.json();
  return data;
};


// Search FriendUid by username
export const searchFriendUid = async (query) => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/searchFriendUid?username=${query}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search users');
  }
  const data = await response.json();
  return data;
};

// Search username by uid
export const searchUsername = async (query) => {
  const response = await fetchWithAuth(`${BACKEND_URL}/api/user/get-friend-username-by-id?uid=${query}`);
  console.log("searchUsername response:", response);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search users');
  }
  const data = await response.json();
  return data;
}