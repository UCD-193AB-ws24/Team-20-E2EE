import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { createServer } from "http";
import { Server } from "socket.io";
import admin from "./firebaseAdmin.js";
import { connectDB } from "./mongo/connection.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();
console.log("MongoDB URI in server.js:", process.env.ATLAS_URI);

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Your client URL
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }
});

// Track online users: { uid: socketId }
const onlineUsers = new Map();
// Track socket to user mapping: { socketId: uid }
const socketToUser = new Map();

// Export io and onlineUsers for use in other files
export { io, onlineUsers };

// Socket.io authentication middleware
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

// Initialize MongoDB connection
const initializeApp = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully");
    
    // Socket.io connection handler
    io.on("connection", async (socket) => {
      console.log("New connection:", socket.id);
      
      try {
        const userId = socket.user.uid;
        
        // Store user as online
        onlineUsers.set(userId, socket.id);
        socketToUser.set(socket.id, userId);
        
        console.log(`User ${userId} connected with socket ${socket.id}`);
        
        // Get user info from database
        const db = await connectDB();
        const usersCollection = db.collection("users");
        const currentUser = await usersCollection.findOne({ uid: userId });
        
        if (currentUser) {
          // Notify friends that user is online
          if (currentUser.friends && currentUser.friends.length > 0) {
            for (const friendId of currentUser.friends) {
              if (onlineUsers.has(friendId)) {
                io.to(onlineUsers.get(friendId)).emit("user_online", {
                  userId: currentUser.uid,
                  username: currentUser.username
                });
              }
            }
          }
        }

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
        
        // Handle disconnection
        socket.on("disconnect", async () => {
          console.log(`Socket ${socket.id} disconnected`);
          
          // Get user ID from socket ID
          const userIdFromSocket = socketToUser.get(socket.id);
          if (userIdFromSocket) {
            // Remove from tracking maps
            onlineUsers.delete(userIdFromSocket);
            socketToUser.delete(socket.id);
            
            // Notify friends that user is offline
            const currentUser = await usersCollection.findOne({ uid: userIdFromSocket });
            if (currentUser && currentUser.friends && currentUser.friends.length > 0) {
              for (const friendId of currentUser.friends) {
                if (onlineUsers.has(friendId)) {
                  io.to(onlineUsers.get(friendId)).emit("user_offline", {
                    userId: currentUser.uid,
                    username: currentUser.username
                  });
                }
              }
            }
          }
        });
      } catch (error) {
        console.error("Error in socket connection:", error);
      }
    });

    // Set up interval to log online users every 5 seconds
    setInterval(async () => {
      const onlineUserCount = onlineUsers.size;
      
      if (onlineUserCount > 0) {
        console.log(`\n---- Online Users (${onlineUserCount}) ----`);
        
        // Get usernames for logging
        const db = await connectDB();
        const usersCollection = db.collection("users");
        
        for (const [userId, socketId] of onlineUsers.entries()) {
          try {
            const user = await usersCollection.findOne({ uid: userId });
            console.log(`User: ${user ? user.username : 'Unknown'} (${userId}) - Socket: ${socketId}`);
          } catch (err) {
            console.log(`User: Unknown (${userId}) - Socket: ${socketId}`);
          }
        }
        console.log("----------------------------\n");
      }
    }, 5000); // Log every 5 seconds

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Middleware setup
app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Replace with your frontend URL
      methods: "GET, POST, PUT, DELETE", // Allow multiple HTTP methods
      allowedHeaders: "Content-Type,Authorization", // Allow Content-Type header
      credentials: true // Enable credentials
    })
);

// Routes
app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);  
app.use("/api/user", userRoutes);

// Initialize the app and start the server
initializeApp().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});