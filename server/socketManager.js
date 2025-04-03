import { Server } from "socket.io";
import { connectDB } from "./mongo/connection.js";
import admin from "./firebaseAdmin.js";

const onlineUsers = new Map(); // { uid: socketId }
const socketToUser = new Map(); // { socketId: uid }

let io = null;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      socket.user = decodedToken;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("New connection:", socket.id);

    try {
      const userId = socket.user.uid;

      // Store user as online
      onlineUsers.set(userId, socket.id);
      socketToUser.set(socket.id, userId);

      console.log(`User ${userId} connected with socket ${socket.id}`);

      const db = await connectDB();
      const usersCollection = db.collection("users");

      // Notify friends that user is online
      const currentUser = await usersCollection.findOne({ uid: userId });
      if (currentUser?.friends?.length > 0) {
        for (const friendId of currentUser.friends) {
          if (onlineUsers.has(friendId)) {
            io.to(onlineUsers.get(friendId)).emit("user_online", {
              userId: currentUser.uid,
              username: currentUser.username,
            });
          }
        }
      }

      // Handle socket events
      registerSocketEvents(socket, usersCollection, currentUser);

      // Handle disconnection
      socket.on("disconnect", async () => {
        console.log(`Socket ${socket.id} disconnected`);
        handleDisconnection(socket, usersCollection);
      });
    } catch (error) {
      console.error("Error in socket connection:", error);
    }
  });

  return io;
};

const registerSocketEvents = (socket, usersCollection, currentUser) => {
    // Handle private messages
    socket.on("private_message", async (data) => {
        try {
            const { recipientUsername, text } = data;
            const senderId = userId;
            
            if (!recipientUsername || !text) {
            socket.emit("error", { message: "Invalid message format" });
            return;
            }
            
            // Get recipient from database by username
            const recipientUser = await usersCollection.findOne({ username: recipientUsername });
            
            if (!recipientUser) {
            socket.emit("error", { message: "Recipient not found" });
            return;
            }
            
            const recipientId = recipientUser.uid;
            
            // Create message object
            const messageObject = {
            sender: senderId,
            recipient: recipientId,
            senderUsername: currentUser.username,
            recipientUsername,
            text,
            timestamp: new Date(),
            read: false
            };
            
            // Save message to database
            const messagesCollection = db.collection("messages");
            const result = await messagesCollection.insertOne(messageObject);
            
            // Format message for sending
            const formattedMessage = {
            _id: result.insertedId,
            sender: currentUser.username,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            // Send to recipient if online
            if (onlineUsers.has(recipientId)) {
            io.to(onlineUsers.get(recipientId)).emit("receive_message", {
                ...formattedMessage,
                sender: currentUser.username
            });
            }
            
            // Confirm to sender
            socket.emit("message_sent", {
            ...formattedMessage,
            recipient: recipientUsername
            });
        } catch (error) {
            console.error("Error sending private message:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });
    
    // Handle typing events
    socket.on("typing", async (data) => {
    try {
        const { recipientUsername, isTyping } = data;
        
        // Get recipient from database
        const recipientUser = await usersCollection.findOne({ username: recipientUsername });
        
        if (recipientUser && onlineUsers.has(recipientUser.uid)) {
        io.to(onlineUsers.get(recipientUser.uid)).emit("user_typing", {
            username: currentUser.username,
            isTyping
        });
        }
    } catch (error) {
        console.error("Error with typing event:", error);
    }
    });
};

const handleDisconnection = async (socket, usersCollection) => {
  const userIdFromSocket = socketToUser.get(socket.id);
  if (userIdFromSocket) {
    onlineUsers.delete(userIdFromSocket);
    socketToUser.delete(socket.id);

    const currentUser = await usersCollection.findOne({ uid: userIdFromSocket });
    if (currentUser?.friends?.length > 0) {
      for (const friendId of currentUser.friends) {
        if (onlineUsers.has(friendId)) {
          io.to(onlineUsers.get(friendId)).emit("user_offline", {
            userId: currentUser.uid,
            username: currentUser.username,
          });
        }
      }
    }
  }
};

export const getOnlineUsers = () => onlineUsers;
export const getSocketInstance = () => io;