import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { createServer } from "http";
import { connectDB } from "./mongo/connection.js";
import { initializeSocket } from "./socketManager.js";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";
import keyBundleRoutes from './routes/keyBundle.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

const initializeApp = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["https://ema-chat.com", "http://localhost:5173"],
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Routes
app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);  
app.use("/api/user", userRoutes);
app.use("/api/keys", keyBundleRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Fallback route for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Start server
initializeApp().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
