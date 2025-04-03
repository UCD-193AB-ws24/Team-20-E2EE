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

        // Handle friend requests
        socket.on("send_friend_request", async (data) => {
        try {
            const friendUsername = data;
            const uid = socket.user.uid;

            console.log(friendUsername, "friendUsername");
        
            if (!uid) {
            return socket.emit("friend_request_error", { error: "Unauthorized - No user ID found" });
            }
        
            if (!friendUsername) {
            return socket.emit("friend_request_error", { error: "Friend username is required" });
            }
        
            const db = await connectDB();
            const usersCollection = db.collection("users");
        
            // Find the current user's document
            const currentUser = await usersCollection.findOne({ uid: uid });
            if (!currentUser) {
            return socket.emit("friend_request_error", { error: "Current user not found" });
            }

            if (currentUser.username === friendUsername) {
            return socket.emit("friend_request_error", { error: "You cannot send a friend request to yourself" });
            }
        
            // Find the friend in the database
            const friend = await usersCollection.findOne({ username: friendUsername });
            if (!friend) {
            return socket.emit("friend_request_error", { error: "User not found" });
            }
            
            // Check if attempting to add yourself
            if (currentUser.uid === friend.uid) {
            return socket.emit("friend_request_error", { error: "You cannot send a friend request to yourself" });
            }
            
            // Check if the friend is already in the `friends` array
            if (currentUser.friends && currentUser.friends.includes(friend.uid)) {
            return socket.emit("friend_request_error", { error: "You are already friends with this user" });
            }
            
            // Check if friend request already exists
            if (friend.friendsRequests && friend.friendsRequests.includes(uid)) {
            return socket.emit("friend_request_error", { error: "Friend request already sent" });
            }
            
            // Check if the user has a pending request from this friend
            if (currentUser.friendsRequests && currentUser.friendsRequests.includes(friend.uid)) {
            return socket.emit("friend_request_error", { error: "You already have a friend request from this user" });
            }
        
            // Add friend request to friend's `friendRequests` array
            const result = await usersCollection.updateOne(
            { username: friendUsername },
            { $addToSet: { friendsRequests: uid } }
            );
        
            if (result.modifiedCount === 0) {
            return socket.emit("friend_request_error", { error: "Friend request already sent" });
            }
        
            // Notify the client that the request was sent successfully
            socket.emit("friend_request_success", { message: "Friend request sent successfully" });
            
            // If the friend is online, notify them about the new request
            if (onlineUsers.has(friend.uid)) {
            io.to(onlineUsers.get(friend.uid)).emit("receive_friend_request", {
                from: currentUser.username,
                type: "new_request"
            });
            }
        
        } catch (error) {
            console.error("Error sending friend request:", error);
            socket.emit("friend_request_error", { error: "Internal server error" });
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