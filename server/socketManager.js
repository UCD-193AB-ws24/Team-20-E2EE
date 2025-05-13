import { Server } from "socket.io";
import { connectDB } from "./mongo/connection.js";
import jwt from "jsonwebtoken";

const onlineUsers = new Map(); // { uid: socketId }
const socketToUser = new Map(); // { socketId: uid }

let io = null;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://ema-chat.com",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.use(async (socket, next) => {
    try {

      const rawCookies = socket.handshake.headers.cookie;
      const refreshToken = rawCookies
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('refreshToken='))
      ?.split('=')[1];  
      
      console.log("Socket authentication token:", refreshToken);
      if (!refreshToken) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Verify access_token
      const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET);

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

    socket.on('get_initial_status', async () => {
      try {
        const friends = currentUser?.friends || [];
        const onlineFriends = [];

        for (const friendId of friends) {
          const isOnline = onlineUsers.has(friendId);    
          const friendUser = await usersCollection.findOne({ uid: friendId });

          if (!friendUser) {
            console.error(`Friend user not found for ID: ${friendId}`);
            continue;
          }

          const friendUsername = friendUser.username;

          if (friendUsername) {
            onlineFriends.push({
              username: friendUsername,
              online: isOnline,
            });
          }
        }
        socket.emit('initial_status', { friends: onlineFriends });
      } catch (error) {
        console.error("Error handling initial status request:", error);
      }
    });

    socket.emit('socket_event_listeners_ready');
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