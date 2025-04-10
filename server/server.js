import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { createServer } from "http";
import { connectDB } from "./mongo/connection.js";
import { initializeSocket } from "./socketManager.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = initializeSocket(httpServer);

// Initialize MongoDB connection
const initializeApp = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully");
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