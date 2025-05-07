import { connectDB } from "../mongo/connection.js";
import { getSocketInstance, getOnlineUsers } from "../socketManager.js";
import { ObjectId } from "mongodb";

export const messageController = async (req, res) => {
  const { message } = req.body;
  console.log("Received message:", message);
  res.json({ response: `Message Received: ${message}` });
};

export const getChatHistory = async (req, res) => {
  try {
    const { username } = req.query;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!username) {
      return res.status(400).json({ error: "Username parameter is required" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");

    // Find the recipient user by username
    const recipientUser = await usersCollection.findOne({ username });

    if (!recipientUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const recipientId = recipientUser.uid;

    // Get messages between the two users
    const messagesCollection = db.collection("messages");
    const messages = await messagesCollection
      .find({
        $or: [
          { sender: currentUserId, recipient: recipientId },
          { sender: recipientId, recipient: currentUserId },
        ],
      })
      .sort({ timestamp: 1 })
      .toArray();

    // Format messages for client
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        // Get sender username if needed
        let senderUsername = msg.senderUsername;
        if (!senderUsername) {
          const sender = await usersCollection.findOne({ uid: msg.sender });
          senderUsername = sender?.username || "Unknown";
        }

        return {
          _id: msg._id,
          sender: msg.sender === currentUserId ? "Me" : senderUsername,
          text: msg.text,
          time: msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

    // Mark messages as read
    await messagesCollection.updateMany(
      { sender: recipientId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatArchive = async (req, res) => {
  try {
    const { username } = req.query;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!username) {
      return res.status(400).json({ error: "Username parameter is required" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");

    // Find the recipient user by username
    const recipientUser = await usersCollection.findOne({ username });

    if (!recipientUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const recipientId = recipientUser.uid;

    // Get messages between the two users
    const messagesCollection = db.collection("archive");
    const messages = await messagesCollection
      .find({
        $or: [
          { sender: currentUserId, recipient: recipientId },
          { sender: recipientId, recipient: currentUserId },
        ],
      })
      .sort({ timestamp: 1 })
      .toArray();

    // Format messages for client
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        // Get sender username if needed
        let senderUsername = msg.senderUsername;
        if (!senderUsername) {
          const sender = await usersCollection.findOne({ uid: msg.sender });
          senderUsername = sender?.username || "Unknown";
        }

        return {
          _id: msg._id,
          sender: msg.sender === currentUserId ? "Me" : senderUsername,
          text: msg.text,
          time: msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

    // Mark messages as read
    await messagesCollection.updateMany(
      { sender: recipientId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching chat archive:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessagePreviews = async (req, res) => {
  try {
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const messagesCollection = db.collection("messages");

    // Get current user
    const currentUser = await usersCollection.findOne({ uid: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const friends = currentUser.friends || [];

    // Get the last message exchanged with each friend
    const previews = [];

    for (const friendId of friends) {
      // Find the friend's username
      const friend = await usersCollection.findOne({ uid: friendId });
      if (!friend) continue;

      // Get the last message between current user and this friend
      const lastMessage = await messagesCollection
        .find({
          $or: [
            { sender: currentUserId, recipient: friendId },
            { sender: friendId, recipient: currentUserId },
          ],
        })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (lastMessage.length > 0) {
        const message = lastMessage[0];
        const senderUsername =
          message.sender === currentUserId ? "Me" : friend.username;

        previews.push({
          username: friend.username,
          lastMessage: {
            sender: senderUsername,
            text: message.text,
            timestamp: message.timestamp,
          },
        });
      } else {
        // No messages yet with this friend
        previews.push({
          username: friend.username,
          lastMessage: null,
        });
      }
    }

    res.json({ previews });
  } catch (error) {
    console.error("Error fetching message previews:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendPrivateMessage = async (req, res) => {
  try {
    // Check for current user
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");

    const senderUser = await usersCollection.findOne({ uid: uid });
    if (!senderUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const { recipientUsername, text } = req.body;

    console.log("Raw request body:", req.body);
    console.log("recipientUsername:", recipientUsername);
    console.log("text:", text);

    if (!recipientUsername || !text) {
      return res.status(406).json({ error: "Invalid message format" });
    }

    const recipientUser = await usersCollection.findOne({
      username: recipientUsername,
    });

    if (!recipientUser) {
      console.log("No recipient");
      return res.status(404).json({ error: "Recipient not found" });
    }

    const recipientId = recipientUser.uid;

    const message = {
      sender: uid,
      recipient: recipientId,
      senderUsername: senderUser.username,
      recipientUsername,
      text,
      timestamp: new Date(),
      read: false,
    };

    const messagesCollection = db.collection("messages");
    const result = await messagesCollection.insertOne(message);

    // Format message for sending
    const formattedMessage = {
      _id: result.insertedId,
      sender: senderUser.username,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();
    console.log(senderUser.username);

    // Send to recipient if online
    if (onlineUsers.has(recipientId)) {
      io.to(onlineUsers.get(recipientId)).emit("receive_message", {
        ...formattedMessage,
        sender: senderUser.username,
      });
    }

    // Confirm to sender
    io.to(onlineUsers.get(uid)).emit("message_sent", {
      ...formattedMessage,
      recipient: recipientUsername,
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
      messageId: result.insertedId,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    const { groupId, text } = req.body;
    if (!groupId || !text) {
      return res.status(406).json({ error: "Invalid message format" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const groupsCollection = db.collection("groups");
    const messagesCollection = db.collection("messages");

    const senderUser = await usersCollection.findOne({ uid });
    if (!senderUser) {
      return res.status(404).json({ error: "Sender user not found" });
    }

    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (!group || !Array.isArray(group.members)) {
      return res.status(404).json({ error: "Group not found or has no members" });
    }

    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    const formattedMessages = [];

    for (const memberUid of group.members) {
      // Skip the sender — their message can be handled separately if needed
      if (memberUid === uid) continue;

      const recipientUser = await usersCollection.findOne({ uid: memberUid });
      if (!recipientUser) continue;

      const message = {
        sender: uid,
        recipient: memberUid,
        senderUsername: senderUser.username,
        recipientUsername: recipientUser.username,
        groupId,
        groupName: group.name,
        text,
        timestamp: new Date(),
        read: false,
      };

      const result = await messagesCollection.insertOne(message);

      const formattedMessage = {
        _id: result.insertedId,
        sender: senderUser.username,
        text,
        groupId,
        groupName: group.name,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      // Emit to recipient if online
      if (onlineUsers.has(memberUid)) {
        io.to(onlineUsers.get(memberUid)).emit("receive_message", formattedMessage);
      }

      formattedMessages.push({
        ...formattedMessage,
        recipient: recipientUser.username,
      });
    }

    // Optionally insert a copy for the sender too
    const selfMessage = {
      sender: uid,
      recipient: uid,
      senderUsername: senderUser.username,
      recipientUsername: senderUser.username,
      groupId,
      groupName: group.name,
      text,
      timestamp: new Date(),
      read: true,
    };

    const selfResult = await messagesCollection.insertOne(selfMessage);

    if (onlineUsers.has(uid)) {
      io.to(onlineUsers.get(uid)).emit("message_sent", {
        ...formattedMessages[0],
        _id: selfResult.insertedId,
        recipient: group.name,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group message sent to all members individually",
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("Error sending group message:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



export const deleteMessages = async (req, res) => {
  try {
    console.log("Received request to vanish messages with:", req.body.username);
    const userId = req.user?.uid;
    const { username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ error: "Missing user ID or username" });
    }

    const db = await connectDB();
    const users = db.collection("users");

    const recipientUser = await users.findOne({ username });
    if (!recipientUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const otherUserId = recipientUser.uid;

    const messages = db.collection("messages");
    const deleted = db.collection("deleted_messages");

    const chatMessages = await messages
      .find({
        $or: [
          { sender: userId, recipient: otherUserId },
          { sender: otherUserId, recipient: userId },
        ],
      })
      .toArray();

    console.log(`Found ${chatMessages.length} messages to archive`);

    if (chatMessages.length > 0) {
      await deleted.insertMany(chatMessages);
      await messages.deleteMany({
        _id: { $in: chatMessages.map((m) => m._id) },
      });
      console.log(`Archived and deleted ${chatMessages.length} messages`);
    }

    res.status(200).json({ success: true, count: chatMessages.length });
  } catch (err) {
    console.error("Error in deleteMessages:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.query;
    const currentUserId = req.user?.uid;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupId) {
      return res.status(400).json({ error: "groupId parameter is required" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const messagesCollection = db.collection("messages");
    const messages = await messagesCollection
      .find({ groupId })
      .sort({ timestamp: 1 })
      .toArray();

    // Format messages for client
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        // Get sender username if needed
        let senderUsername = msg.senderUsername;
        if (!senderUsername) {
          const sender = await usersCollection.findOne({ uid: msg.sender });
          senderUsername = sender?.username || "Unknown";
        }

        return {
          _id: msg._id,
          sender: msg.sender === currentUserId ? "Me" : senderUsername,
          text: msg.text,
          time: msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { groupName, members } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupName || !members || members.length === 0) {
      return res
        .status(400)
        .json({ error: "Group name and members are required" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");

    // Create a new group
    const newGroup = {
      name: groupName,
      members: [userId, ...members],
      createdAt: new Date(),
    };

    const result = await groupsCollection.insertOne(newGroup);

    res.status(201).json({ success: true, groupId: result.insertedId });
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


//get all groups chat
export const getAllGroupChat = async (req, res) => {
try{
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");

    // Find all groups the user is a member of
    const groups = await groupsCollection
      .find({ members: userId })
      .toArray();
    res.status(200).json({ success: true, groups });

}catch(error){
    console.error('Error getting group chat', error);
    res.status(500).json({ error: "Internal server error" });
}

}

// add member to group chat
export const addMemberToGroup = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupId || !memberId) {
      return res.status(400).json({ error: "Group ID and member ID are required" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");

    console.log("Adding member to group:", groupId, memberId);

    // Add the new member to the group
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members: memberId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Group not found or member already in group" });
    }

    res.status(200).json({ success: true, message: "Member added to group" });
  } catch (err) {
    console.error("Error adding member to group:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// remove member from group chat
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupId || !memberId) {
      return res.status(400).json({ error: "Group ID and member ID are required" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");

    console.log("Removing member from group:", groupId, memberId);

    // Remove the member from the group
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { members: memberId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Group not found or member not in group" });
    }

    // delete the group if it has no members left
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (group && group.members.length === 0) {
      await groupsCollection.deleteOne({ _id: new ObjectId(groupId) });
    }


    res.status(200).json({ success: true, message: "Member removed from group" });
  } catch (err) {
    console.error("Error removing member from group:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


// update group name
export const updateGroupName = async (req, res) => {
  try {
    const { groupId, groupName: newGroupName } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupId || !newGroupName) {
      return res.status(400).json({ error: "Group ID and new group name are required" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");

    console.log("Updating group name:", groupId, newGroupName);

    // Update the group's name
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { name: newGroupName } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ success: true, message: "Group name updated" });
  } catch (err) {
    console.error("Error updating group name:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};