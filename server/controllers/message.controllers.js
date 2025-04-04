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
        const messages = await messagesCollection.find({
            $or: [
                { sender: currentUserId, recipient: recipientId },
                { sender: recipientId, recipient: currentUserId }
            ]
        }).sort({ timestamp: 1 }).toArray();
        
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
                text: msg.text,
                time: msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        }));
        
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
                        time: message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

        const { recipientUsername, text } = req.body;

        if (!recipientUsername || !text) {
            return res.status(406).json({ error: "Invalid message format" });
        }

        const recipientUser = await usersCollection.findOne({ username: recipientUsername });
        
        if (!recipientUser) {
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
            read: false
        }

        const messagesCollection = db.collection("messages");
        const result = await messagesCollection.insertOne(message);
        
        // Format message for sending
        const formattedMessage = {
            _id: result.insertedId,
            sender: senderUser.username,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const io = getSocketInstance();
        const onlineUsers = getOnlineUsers();
        console.log(senderUser.username);

        // Send to recipient if online
        if (onlineUsers.has(recipientId)) {
            io.to(onlineUsers.get(recipientId)).emit("receive_message", {
                ...formattedMessage,
                sender: senderUser.username
            });
        }
        
        // Confirm to sender
        io.to(onlineUsers.get(uid)).emit("message_sent", {
            ...formattedMessage,
            recipient: recipientUsername
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal server error" })
    }
}