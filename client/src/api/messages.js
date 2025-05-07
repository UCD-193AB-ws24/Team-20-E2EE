import { BACKEND_URL } from "../config/config.js";
import fetchWithAuth from "../util/FetchWithAuth.jsx";
import { searchFriendUid } from "./friends.js";

// Get chat history between current user and another user
export const getChatHistory = async (token, username) => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/history?username=${username}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch chat history");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return { messages: [] };
  }
};

export const getGroupHistory = async (groupId) => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/get-group-history?groupId=${groupId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch chat history");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return { messages: [] };
  }
};

export const getArchivedChatHistory = async (token, username) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/message/history?username=${username}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch chat history");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return { messages: [] };
  }
};

// Get message previews for all friends
export const getAllMessagePreviews = async () => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/previews`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch message previews");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching message previews:", error);
    return { previews: [] };
  }
};

export const sendPrivateMessage = async (recipientUsername, text) => {
  try {
    console.log("recipientUsername:", recipientUsername);
    console.log("text:", text);
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipientUsername, text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    return response.json();
  } catch (error) {
    console.error("Error sending message", error);
    return;
  }
};

export const sendGroupMessage = async (groupId, text) => {
  try {
    console.log("groupId:", groupId);
    console.log("text:", text);
    const response = await fetchWithAuth(`${BACKEND_URL}/api/message/send-group`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groupId, text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    return response.json();
  } catch (error) {
    console.error("Error sending message", error);
    return;
  }
};

// Create a group chat
export const createGroupChat = async (groupName, members) => {
  console.log("Creating group chat with name:", groupName);
  console.log("Members:", members);
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/create-group`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupName, members }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create group chat");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating group chat", error);
    return;
  }
};

// get all group chat
export const getAllGroupChat = async () => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/get-groups`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch group chat");
    }

    return data.groups;
  } catch (error) {
    console.error("Error fetching group chat", error);
    return;
  }
};

// add member to group chat
export const addMemberToGroup = async (groupId, memberUsername) => {
  try {
    //Find member id by username
    const { uid: memberId } = await searchFriendUid(memberUsername);
    if (!memberId) {
      throw new Error("Member not found");
    }

    // Add member to group chat
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/add-member-to-group`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId, memberId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add member to group chat");
    }

    return response.json();
  } catch (error) {
    console.error("Error adding member to group", error);
    return;
  }
};

export const removeMemberFromGroup = async (groupId, memberUsername) => {
  try {
    //Find member id by username
    const { uid: memberId } = await searchFriendUid(memberUsername);
    if (!memberId) {
      throw new Error("Member not found");
    }

    // Remove member from group chat
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/remove-member-from-group`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId, memberId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove member from group chat");
    }

    return response.json();
  } catch (error) {
    console.error("Error removing member from group", error);
    return;
  }
};


// update group name
export const updateGroupName = async (groupId, groupName) => {
  try {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/message/update-group-name`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId, groupName }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update group name");
    }

    return response.json();
  } catch (error) {
    console.error("Error updating group name", error);
    return;
  }
}