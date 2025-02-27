import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";
import mongoose from "mongoose";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Replace with your frontend URL
      methods: "GET,POST", // Allow GET and POST requests
      allowedHeaders: "Content-Type,Authorization", // Allow Content-Type header
    })
  );

app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);  
app.use("/api/user", userRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
