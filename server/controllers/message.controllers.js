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
    const currentDeviceId = req.query.deviceId || req.headers['x-device-id']; // Get device ID from query or header

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const messagesCollection = db.collection("messages");

    if (!username) {
      // Fetch all unread messages for current device
      const query = {
        recipientUid: currentUserId,
        read: false
      };

      // If device ID provided, filter by device
      if (currentDeviceId) {
        query.recipientDeviceId = currentDeviceId;
      }

      const messages = await messagesCollection.find(query)
        .sort({ timestamp: 1 }).toArray();

      const formattedMessages = await Promise.all(messages.map(async (msg) => {
        let senderUsername = msg.senderUsername;
        if (!senderUsername) {
          const sender = await usersCollection.findOne({ uid: msg.sender });
          senderUsername = sender?.username || "Unknown";
        }

        return {
          _id: msg._id,
          sender: senderUsername,
          senderUid: msg.sender,
          senderDeviceId: msg.senderDeviceId,
          recipientUid: currentUserId,
          recipientDeviceId: msg.recipientDeviceId,
          recipientUsername: msg.recipientUsername,
          encryptedMessage: msg.encryptedMessage,
          isEncrypted: msg.isEncrypted,
          time: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: msg.timestamp
        };
      }));

      return res.json({ messages: formattedMessages });
    }

    // Normal conversation history for specific user
    const recipientUser = await usersCollection.findOne({ username });
    if (!recipientUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const recipientId = recipientUser.uid;

    const query = {
      $or: [
        { 
          sender: currentUserId, 
          recipientUid: recipientId 
        },
        { 
          sender: recipientId, 
          recipientUid: currentUserId
        }
      ]
    };

    // If device ID provided, filter incoming messages by device
    if (currentDeviceId) {
      query.$or[1].recipientDeviceId = currentDeviceId;
    }

    const messages = await messagesCollection.find(query)
      .sort({ timestamp: 1 }).toArray();

    const formattedMessages = await Promise.all(messages.map(async (msg) => {
      let senderUsername = msg.senderUsername;
      if (!senderUsername) {
        const sender = await usersCollection.findOne({ uid: msg.sender });
        senderUsername = sender?.username || "Unknown";
      }

      return {
        _id: msg._id,
        sender: msg.sender === currentUserId ? "Me" : senderUsername,
        senderUid: msg.sender,
        senderDeviceId: msg.senderDeviceId,
        encryptedMessage: msg.encryptedMessage,
        isEncrypted: msg.isEncrypted,
        time: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }));

    // Mark messages as read for current device only
    const markReadQuery = { 
      sender: recipientId, 
      recipientUid: currentUserId, 
      read: false 
    };
    
    if (currentDeviceId) {
      markReadQuery.recipientDeviceId = currentDeviceId;
    }

    await messagesCollection.updateMany(markReadQuery, { $set: { read: true } });

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatArchive = async (req, res) => {
  try {
    const { chatId } = req.query;
    console.log("chatId: ", chatId);
    if (!chatId) {
      return res.status(400).json({ error: "Missing chatId parameter" });
    }

    const db = await connectDB();
    const messagesCollection = db.collection("archive");

    const messages = await messagesCollection
      .find({ chatId })
      .sort({ timestamp: 1 })
      .toArray();

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      senderUid: msg.senderUid,
      recipientUid: msg.recipientUid,
      text: msg.text,
      timestamp: msg.timestamp,
    }));

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

    const { recipientUsername, encryptedMessages, senderDeviceId, metadata } = req.body;

    if (!recipientUsername || !encryptedMessages || !Array.isArray(encryptedMessages)) {
      return res.status(400).json({ error: "Invalid message format - encryptedMessages array required" });
    }

    const recipientUser = await usersCollection.findOne({ username: recipientUsername });
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const recipientId = recipientUser.uid;
    const onlineUsers = getOnlineUsers();
    const messagesCollection = db.collection("messages");

    // Store a separate message record for each recipient device
    const messagePromises = encryptedMessages.map(async (deviceMessage) => {
      const message = {
        sender: uid,
        recipientUid: recipientId,
        recipientDeviceId: deviceMessage.deviceId,
        senderUsername: senderUser.username,
        senderDeviceId,
        recipientUsername,
        encryptedMessage: {
          type: deviceMessage.encryptedMessage.type,
          body: deviceMessage.encryptedMessage.body
        },
        isEncrypted: true,
        timestamp: new Date(),
        read: false,
        metadata: metadata,
      };

      return await messagesCollection.insertOne(message);
    });

    const results = await Promise.all(messagePromises);

    // Send real-time notification if recipient is online
    const io = getSocketInstance();
    
    if (onlineUsers.has(recipientId)) {
      // Send all encrypted messages to the online user
      encryptedMessages.forEach((deviceMessage, index) => {
        const formattedMessage = {
          _id: results[index].insertedId,
          senderUid: uid,
          sender: senderUser.username,
          senderDeviceId,
          recipientDeviceId: deviceMessage.deviceId,
          encryptedMessage: deviceMessage.encryptedMessage,
          isEncrypted: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(),
          metadata
        };

        io.to(onlineUsers.get(recipientId)).emit("receive_message", formattedMessage);
      });

      console.log(`Sent ${encryptedMessages.length} device-specific messages to ${recipientUsername}`);
    } else {
      console.log(`User ${recipientUsername} is offline - messages stored for later delivery`);
    }

    return res.status(200).json({
      success: true,
      message: "Encrypted message sent to all devices successfully",
      deviceCount: encryptedMessages.length,
      messageIds: results.map(r => r.insertedId)
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (groupId, text, members) => {
  try {

    // for member in members {
    //   getusername(userid)
    //   fetchkeybundle(username);
    //   !checksession() {
    //     createSession();
    //   }
    //   SendPrivateMessage
    // } 
    for (const member of members) {
      const userId = getCurrentUser().uid;
      if (member === userId) {
        console.log("Skipping self in group message");
        continue;
      }

      console.log("Fetching info for :", member);
      const { username } = await searchUsername(member);

      console.log("Fetched username:", username);

      const recipientKeyBundle = await fetchKeyBundle(username);
      const recipientUid = recipientKeyBundle.keyBundle.uid;
      const recipientDeviceId = recipientKeyBundle.keyBundle.deviceId;

      const sessionExists = await hasSession(userId, recipientUid, recipientDeviceId);
      if (!sessionExists) {
        console.log("No session, establishing new session");
        await establishSession(userId, recipientUid, recipientKeyBundle.keyBundle);
      }

      const metadata = {
        isGroupMessage: true,
        groupId: groupId,
      }
      sendPrivateMessage(username, text, { uid: recipientUid, deviceId: recipientDeviceId }, metadata);
    }
  } catch (error) {
    console.error("Error sending group message", error);
    return;
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

export const storeMessage = async (req, res) => {
  try {
    const { chatId, senderUid, recipientUid, text, timestamp } = req.body;
    if (!chatId || !senderUid || !recipientUid || !text || !timestamp) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const db = await connectDB();
    const prefsCollection = db.collection("archivePreferences");
    const messagesCollection = db.collection("archive");
    const prefs = await prefsCollection.findOne({ chatId });

    const AOptedIn = prefs[`${prefs.userA}OptedIn`]
    const BOptedIn = prefs[`${prefs.userB}OptedIn`]

    const bothOptedIn = AOptedIn && BOptedIn;

    console.log("storeMessage: User A opted in status: ", AOptedIn);
    console.log("storeMessage: User B opted in status: ", BOptedIn);
    console.log("storeMessage: Both opted in status: ", bothOptedIn);

    if (bothOptedIn) {
      console.log("Archiving message: ", text);
      const result = await messagesCollection.insertOne({
        chatId,
        senderUid,
        recipientUid,
        text,
        timestamp: new Date(timestamp),
      });
      return res.status(200).json({ success: true, messageId: result.insertedId });
    } else {
      return res.status(403).json({ error: "Both users must opt in to archive" });
    }


  } catch (err) {
    console.error("Error storing archived message:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

};

export const getArchiveStatus = async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ error: "Missing chatId" });

    const db = await connectDB();
    const prefs = await db.collection("archivePreferences").findOne({ chatId });

    if (!prefs) return res.status(200).json({ archiveEnabled: false });

    const AOptedIn = prefs[`${prefs.userA}OptedIn`]
    const BOptedIn = prefs[`${prefs.userB}OptedIn`]

    const bothOptedIn = AOptedIn && BOptedIn;
    console.log("getArchiveStatus: User A opted in status: ", AOptedIn);
    console.log("getArchiveStatus: User B opted in status: ", BOptedIn);
    console.log("getArchiveStatus: Both opted in status: ", bothOptedIn);

    return res.status(200).json({ archiveEnabled: bothOptedIn });
  } catch (err) {
    console.error("Error fetching archive status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleArchiveStatus = async (req, res) => {
  try {
    const { chatId, uid, optIn } = req.body;
    const db = await connectDB();
    const prefsCollection = db.collection("archivePreferences");
    let prefs = await prefsCollection.findOne({ chatId });

    if (typeof chatId !== "string" || !chatId.includes("-")) {
      return res.status(400).json({ error: "Invalid chatId format" });
    }

    if (!prefs) {
      console.log("No preferences found. Creating preferences:");
      const [userA, userB] = chatId.split("-");
      prefs = {
        chatId,
        userA,
        userB,
        [`${userA}OptedIn`]: optIn,
        [`${userB}OptedIn`]: false,
        archiveEnabled: false
      };
      console.log(prefs);
      await prefsCollection.insertOne(prefs);
    }
    else {
      console.log("Preferences found.");
      await prefsCollection.updateOne(
        { chatId },
        { $set: { [`${uid}OptedIn`]: optIn } }
      );
    }
    const updated = await prefsCollection.findOne({ chatId });

    const AOptedIn = updated[`${updated.userA}OptedIn`]
    const BOptedIn = updated[`${updated.userB}OptedIn`]

    const bothOptedIn = AOptedIn && BOptedIn;

    console.log("A Opted In: ", AOptedIn);
    console.log("B Opted In: ", BOptedIn);
    console.log("Both Opted In: ", bothOptedIn);


    await prefsCollection.updateOne(
      { chatId },
      { $set: { archiveEnabled: bothOptedIn } }
    );

    if (!bothOptedIn && updated.archiveEnabled) {
      console.log("User opted out of archive. Deleting archive.");
      console.log(chatId);
      await db.collection("archive").deleteMany({ chatId });
    }

    const io = getSocketInstance();

    if (io) {
      io.to(chatId).emit("archiveStatusChanged", {
        chatId,
        mutualArchive: bothOptedIn
      });
    }


    return res.status(200).json({ archiveEnabled: bothOptedIn });
  }

  catch (err) {
    console.error("Archive toggle error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserOptInStatus = async (req, res) => {
  try {
    const { chatId, uid } = req.query;
    const db = await connectDB();
    const prefs = await db.collection("archivePreferences").findOne({ chatId });

    if (!prefs) return res.status(200).json({ optedIn: false });

    const optedIn = prefs[`${uid}OptedIn`] || false;
    return res.status(200).json({ optedIn });
  } catch (err) {
    console.error("Error checking user opt-in status:", err);
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
  try {
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

  } catch (error) {
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