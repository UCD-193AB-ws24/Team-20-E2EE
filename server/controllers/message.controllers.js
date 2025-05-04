import { connectDB } from "../mongo/connection.js";
import { getSocketInstance, getOnlineUsers } from "../socketManager.js";

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

        const db = await connectDB();
        const usersCollection = db.collection("users");
        const messagesCollection = db.collection("messages");
        
        // If no username is provided, fetch ALL unread messages for the current user
        if (!username) {
            // Query for all unread messages where current user is the recipient
            const query = {
                recipientUid: currentUserId,
                read: false
            };
            
            const messages = await messagesCollection.find(query)
                .sort({ timestamp: 1 }).toArray();
            
            // Format messages for client
            const formattedMessages = await Promise.all(messages.map(async (msg) => {
                // Get sender username if needed
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
                    recipientUsername: msg.recipientUsername,
                    encryptedMessage: msg.encryptedMessage,
                    isEncrypted: msg.isEncrypted,
                    time: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: msg.timestamp
                };
            }));
            
            // Return all unread messages without marking them as read
            return res.json({ messages: formattedMessages });
        }
        
        // Normal conversation history logic for when username is provided
        const recipientUser = await usersCollection.findOne({ username });
        
        if (!recipientUser) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const recipientId = recipientUser.uid;
        
        // Build the query for conversation history
        const query = {
            $or: [
                { sender: currentUserId, recipientUid: recipientId },
                { sender: recipientId, recipientUid: currentUserId }
            ]
        };
        
        const messages = await messagesCollection.find(query)
            .sort({ timestamp: 1 }).toArray();
        
        // Format messages for client
        const formattedMessages = await Promise.all(messages.map(async (msg) => {
            // Get sender username if needed
            let senderUsername = msg.senderUsername;
            if (!senderUsername) {
                const sender = await usersCollection.findOne({ uid: msg.sender });
                senderUsername = sender?.username || "Unknown";
            }
            
            return {
                _id: msg._id,
                sender: msg.sender === currentUserId ? "Me" : senderUsername,
                encryptedMessage: msg.encryptedMessage,
                isEncrypted: msg.isEncrypted,
                time: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        }));

        // Mark messages as read when fetching a specific conversation
        await messagesCollection.updateMany(
            { sender: recipientId, recipientUid: currentUserId, read: false },
            { $set: { read: true } }
        );
        
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
            const lastMessage = await messagesCollection.find({
                $or: [
                    { sender: currentUserId, recipient: friendId },
                    { sender: friendId, recipient: currentUserId }
                ]
            })
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();
            
            if (lastMessage.length > 0) {
                const message = lastMessage[0];
                const senderUsername = message.sender === currentUserId ? "Me" : friend.username;
                
                previews.push({
                    username: friend.username,
                    lastMessage: {
                        sender: senderUsername,
                        text: message.text,
                        timestamp: message.timestamp
                    }
                });
            } else {
                // No messages yet with this friend
                previews.push({
                    username: friend.username,
                    lastMessage: null
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
            return res.status(401).json({ error: "Unauthorized - No user ID found" })
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        const senderUser = await usersCollection.findOne({ uid: uid });
        if (!senderUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const { recipientUsername, encryptedMessage, senderDeviceId } = req.body;

        // Validate the request body
        if (!recipientUsername) {
            return res.status(406).json({ error: "Recipient username is required" });
        }

        if (!encryptedMessage || !encryptedMessage.type || !encryptedMessage.body) {
            return res.status(406).json({ error: "Invalid message format - encrypted message required" });
        }

        const recipientUser = await usersCollection.findOne({ username: recipientUsername });
        
        if (!recipientUser) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        const recipientId = recipientUser.uid;
        const onlineUsers = getOnlineUsers();
        
        // Check if recipient is online
        const isRecipientOnline = onlineUsers.has(recipientId);
        
        // Store the encrypted message
        const message = {
            sender: uid,
            recipientUid: recipientId, 
            senderUsername: senderUser.username,
            senderDeviceId,
            recipientUsername,
            encryptedMessage: {
                type: encryptedMessage.type,
                body: encryptedMessage.body
            },
            isEncrypted: true,
            timestamp: new Date(),
            read: isRecipientOnline, // Mark as read immediately if recipient is online
        }

        const messagesCollection = db.collection("messages");
        const result = await messagesCollection.insertOne(message);
        
        // Format message for sending
        const formattedMessage = {
            _id: result.insertedId,
            senderUid: uid,
            sender: senderUser.username,
            senderDeviceId,
            encryptedMessage: encryptedMessage,
            isEncrypted: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(),
            read: isRecipientOnline // Include read status in the response
        };
        
        const io = getSocketInstance();
        
        // Send encrypted message to recipient if online
        if (isRecipientOnline) {
            io.to(onlineUsers.get(recipientId)).emit("receive_message", {
                ...formattedMessage,
                sender: senderUser.username
            });
            
            // You could also emit an event to inform the sender that the message was delivered
            if (onlineUsers.has(uid)) {
                io.to(onlineUsers.get(uid)).emit("message_delivered", {
                    messageId: result.insertedId,
                    recipientUsername
                });
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: "Encrypted message sent successfully",
            messageId: result.insertedId,
            read: isRecipientOnline,
            delivered: isRecipientOnline
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal server error" })
    }
}