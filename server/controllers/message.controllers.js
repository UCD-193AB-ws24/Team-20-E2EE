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

    // Check if recipient is online
    const isRecipientOnline = onlineUsers.has(recipientId);

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
        read: isRecipientOnline, // Set read to true if recipient is online
        metadata: metadata,
      };

      return await messagesCollection.insertOne(message);
    });

    const results = await Promise.all(messagePromises);

    // Send real-time notification if recipient is online
    const io = getSocketInstance();
    
    if (isRecipientOnline) {
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
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true,
            timeZone: 'America/Los_Angeles'
          }),
          timestamp: new Date(),
          metadata
        };

        io.to(onlineUsers.get(recipientId)).emit("receive_message", formattedMessage);
      });

      console.log(`Sent ${encryptedMessages.length} device-specific messages to ${recipientUsername} (online - marked as read)`);
    } else {
      console.log(`User ${recipientUsername} is offline - messages stored for later delivery (marked as unread)`);
    }

    return res.status(200).json({
      success: true,
      message: "Encrypted message sent to all devices successfully",
      deviceCount: encryptedMessages.length,
      messageIds: results.map(r => r.insertedId),
      recipientOnline: isRecipientOnline
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

export const getBlurStatus = async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ error: "Missing chatId" });

    const db = await connectDB();
    const prefs = await db.collection("blurPreferences").findOne({ chatId });

    if (!prefs) return res.status(200).json({ blurEnabled: false });

    const AOptedIn = prefs[`${prefs.userA}OptedIn`];
    const BOptedIn = prefs[`${prefs.userB}OptedIn`];

    const bothOptedIn = AOptedIn && BOptedIn;
    console.log("getBlurStatus: User A opted in:", AOptedIn);
    console.log("getBlurStatus: User B opted in:", BOptedIn);
    console.log("getBlurStatus: Both opted in:", bothOptedIn);

    return res.status(200).json({ blurEnabled: bothOptedIn });
  } catch (err) {
    console.error("Error fetching blur status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleBlurStatus = async (req, res) => {
  try {
    const { chatId, uid, optIn } = req.body;
    const db = await connectDB();
    const prefsCollection = db.collection("blurPreferences");
    let prefs = await prefsCollection.findOne({ chatId });

    if (typeof chatId !== "string" || !chatId.includes("-")) {
      return res.status(400).json({ error: "Invalid chatId format" });
    }

    if (!prefs) {
      const [userA, userB] = chatId.split("-");
      prefs = {
        chatId,
        userA,
        userB,
        [`${userA}OptedIn`]: optIn,
        [`${userB}OptedIn`]: false,
        blurEnabled: false
      };
      await prefsCollection.insertOne(prefs);
    } else {
      await prefsCollection.updateOne(
        { chatId },
        { $set: { [`${uid}OptedIn`]: optIn } }
      );
    }

    const updated = await prefsCollection.findOne({ chatId });
    const AOptedIn = updated[`${updated.userA}OptedIn`];
    const BOptedIn = updated[`${updated.userB}OptedIn`];
    const bothOptedIn = AOptedIn && BOptedIn;

    await prefsCollection.updateOne(
      { chatId },
      { $set: { blurEnabled: bothOptedIn } }
    );

    const io = getSocketInstance();
    if (io) {
      io.to(chatId).emit("blurStatusChanged", {
        chatId,
        mutualBlur: bothOptedIn
      });
    }

    return res.status(200).json({ blurEnabled: bothOptedIn });
  } catch (err) {
    console.error("Blur toggle error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserBlurOptInStatus = async (req, res) => {
  try {
    const { chatId, uid } = req.query;
    const db = await connectDB();
    const prefs = await db.collection("blurPreferences").findOne({ chatId });

    if (!prefs) return res.status(200).json({ optedIn: false });

    const optedIn = prefs[`${uid}OptedIn`] || false;
    return res.status(200).json({ optedIn });
  } catch (err) {
    console.error("Error checking user blur opt-in status:", err);
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
    const usersCollection = db.collection("users");

    // Create a new group with admin field
    const newGroup = {
      name: groupName,
      members: [userId, ...members],
      admin: userId, // Set creator as admin
      createdAt: new Date(),
    };

    const result = await groupsCollection.insertOne(newGroup);
    const createdGroup = await groupsCollection.findOne({ _id: result.insertedId });

    // Get creator details
    const creator = await usersCollection.findOne({ uid: userId });

    // Send real-time notifications to all group members
    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    if (io) {
      for (const memberId of members) {
        if (onlineUsers.has(memberId)) {
          io.to(onlineUsers.get(memberId)).emit("new_group_created", {
            group: createdGroup,
            createdBy: {
              uid: creator.uid,
              username: creator.username
            }
          });
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      groupId: result.insertedId,
      group: createdGroup 
    });
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
    const usersCollection = db.collection("users");

    console.log("Adding member to group:", groupId, memberId);

    // Get the group details first
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the current user is the admin
    if (group.admin !== userId) {
      return res.status(403).json({ error: "Only the group admin can add members" });
    }

    // Get the new member's details
    const newMember = await usersCollection.findOne({ uid: memberId });
    if (!newMember) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if member is already in the group
    if (group.members.includes(memberId)) {
      return res.status(400).json({ error: "User is already a member of this group" });
    }

    // Add the new member to the group
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $addToSet: { members: memberId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Failed to add member to group" });
    }

    // Get updated group with new member
    const updatedGroup = await groupsCollection.findOne({ _id: new ObjectId(groupId) });

    // Send real-time notifications
    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    if (io) {
      // Notify all existing group members about the new member
      for (const existingMemberId of group.members) {
        if (onlineUsers.has(existingMemberId) && existingMemberId !== memberId) {
          io.to(onlineUsers.get(existingMemberId)).emit("group_member_added", {
            groupId: groupId,
            groupName: group.name,
            newMember: {
              uid: newMember.uid,
              username: newMember.username
            },
            updatedGroup: {
              _id: updatedGroup._id,
              name: updatedGroup.name,
              members: updatedGroup.members,
              admin: updatedGroup.admin,
              createdAt: updatedGroup.createdAt
            }
          });
        }
      }

      // Notify the new member about being added to the group
      if (onlineUsers.has(memberId)) {
        io.to(onlineUsers.get(memberId)).emit("added_to_group", {
          groupId: groupId,
          groupName: group.name,
          group: {
            _id: updatedGroup._id,
            name: updatedGroup.name,
            members: updatedGroup.members,
            admin: updatedGroup.admin,
            createdAt: updatedGroup.createdAt
          },
          addedBy: userId
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Member added to group",
      group: updatedGroup 
    });
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
    const usersCollection = db.collection("users");

    console.log("Removing member from group:", groupId, memberId);

    // Get group, member, and remover details before removal
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    const removedMember = await usersCollection.findOne({ uid: memberId });
    const remover = await usersCollection.findOne({ uid: userId });

    if (!group || !removedMember || !remover) {
      return res.status(404).json({ error: "Group, member, or remover not found" });
    }

    // Check permissions:
    // 1. Admin can remove anyone (except themselves - they need to transfer admin first)
    // 2. Any member can remove themselves (leave group)
    const isAdmin = group.admin === userId;
    const isSelfRemoval = memberId === userId;

    if (!isAdmin && !isSelfRemoval) {
      return res.status(403).json({ error: "Only the group admin can remove other members" });
    }

    // Prevent admin from removing themselves (they should transfer admin first)
    if (isAdmin && isSelfRemoval) {
      return res.status(400).json({ 
        error: "Admin cannot leave the group. Please transfer admin privileges to another member first or delete the group." 
      });
    }

    // Cannot remove the admin (unless they're removing themselves, handled above)
    if (memberId === group.admin && !isSelfRemoval) {
      return res.status(400).json({ error: "Cannot remove the group admin" });
    }

    // Remove the member from the group
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $pull: { members: memberId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Group not found or member not in group" });
    }

    // Get updated group
    const updatedGroup = await groupsCollection.findOne({ _id: new ObjectId(groupId) });

    // Delete the group if it has no members left
    if (updatedGroup && updatedGroup.members.length === 0) {
      await groupsCollection.deleteOne({ _id: new ObjectId(groupId) });
    }

    // Send real-time notifications
    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    if (io) {
      // Notify remaining group members
      if (updatedGroup && updatedGroup.members.length > 0) {
        for (const remainingMemberId of updatedGroup.members) {
          if (onlineUsers.has(remainingMemberId)) {
            io.to(onlineUsers.get(remainingMemberId)).emit("group_member_removed", {
              groupId: groupId,
              groupName: group.name,
              removedMember: {
                uid: removedMember.uid,
                username: removedMember.username
              },
              removedBy: {
                uid: remover.uid,
                username: remover.username
              },
              updatedGroup: updatedGroup,
              isAdminAction: isAdmin && !isSelfRemoval
            });
          }
        }
      }

      // Notify the removed member
      if (onlineUsers.has(memberId)) {
        io.to(onlineUsers.get(memberId)).emit("group_member_removed", {
          groupId: groupId,
          groupName: group.name,
          removedMember: {
            uid: removedMember.uid,
            username: removedMember.username
          },
          removedBy: {
            uid: remover.uid,
            username: remover.username
          },
          updatedGroup: null, // Group is gone for this user
          isAdminAction: isAdmin && !isSelfRemoval
        });
      }
    }

    const actionType = isSelfRemoval ? "left" : "removed from";
    res.status(200).json({ 
      success: true, 
      message: `Member ${actionType} group successfully` 
    });
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

    // Get the group first to check admin permissions
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the current user is the admin
    if (group.admin !== userId) {
      return res.status(403).json({ error: "Only the group admin can update the group name" });
    }

    // Update the group's name
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { name: newGroupName.trim() } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Failed to update group name" });
    }

    // Send real-time notification to all group members
    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    if (io) {
      for (const memberId of group.members) {
        if (onlineUsers.has(memberId)) {
          io.to(onlineUsers.get(memberId)).emit("group_name_updated", {
            groupId: groupId,
            oldName: group.name,
            newName: newGroupName.trim(),
            updatedBy: userId
          });
        }
      }
    }

    res.status(200).json({ success: true, message: "Group name updated successfully" });
  } catch (err) {
    console.error("Error updating group name:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// transfer group admin
export const transferGroupAdmin = async (req, res) => {
  try {
    const { groupId, newAdminId } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupId || !newAdminId) {
      return res.status(400).json({ error: "Group ID and new admin ID are required" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");
    const usersCollection = db.collection("users");

    // Get the group
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if current user is admin
    if (group.admin !== userId) {
      return res.status(403).json({ error: "Only the current admin can transfer admin privileges" });
    }

    // Check if new admin is a member of the group
    if (!group.members.includes(newAdminId)) {
      return res.status(400).json({ error: "New admin must be a member of the group" });
    }

    // Update admin
    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { admin: newAdminId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Failed to transfer admin privileges" });
    }

    // Get user details for notifications
    const [oldAdmin, newAdmin] = await Promise.all([
      usersCollection.findOne({ uid: userId }),
      usersCollection.findOne({ uid: newAdminId })
    ]);

    // Send real-time notifications
    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    if (io) {
      for (const memberId of group.members) {
        if (onlineUsers.has(memberId)) {
          io.to(onlineUsers.get(memberId)).emit("group_admin_transferred", {
            groupId: groupId,
            groupName: group.name,
            oldAdmin: { uid: oldAdmin.uid, username: oldAdmin.username },
            newAdmin: { uid: newAdmin.uid, username: newAdmin.username }
          });
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Admin privileges transferred successfully" 
    });
  } catch (err) {
    console.error("Error transferring admin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// delete group
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    const db = await connectDB();
    const groupsCollection = db.collection("groups");
    const messagesCollection = db.collection("messages");

    // Get the group
    const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if current user is admin
    if (group.admin !== userId) {
      return res.status(403).json({ error: "Only the group admin can delete the group" });
    }

    // Delete all group messages
    await messagesCollection.deleteMany({ 
      metadata: { 
        isGroupMessage: true, 
        groupId: groupId 
      } 
    });

    // Delete the group
    const result = await groupsCollection.deleteOne({ _id: new ObjectId(groupId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Failed to delete group" });
    }

    // Send real-time notifications to all members
    const io = getSocketInstance();
    const onlineUsers = getOnlineUsers();

    if (io) {
      for (const memberId of group.members) {
        if (onlineUsers.has(memberId)) {
          io.to(onlineUsers.get(memberId)).emit("group_deleted", {
            groupId: groupId,
            groupName: group.name,
            deletedBy: userId
          });
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Group deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};