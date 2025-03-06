import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userInfoRoutes from "./routes/userinfo.routes.js";
import { connectDB } from "./mongo/connection.js";
import admin from "./firebaseAdmin.js";
import userRoutes from "./routes/user.routes.js";
import mongoose from "mongoose";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

connectDB.once("open", () => {
  console.log("Connected to MongoDB");
});

app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Replace with your frontend URL
      methods: "GET,POST", // Allow GET and POST requests
      allowedHeaders: "Content-Type,Authorization", // Allow Content-Type header
      methods: "GET,POST,PUT", // Allow GET and POST requests
      allowedHeaders: "Content-Type",
    })
  );

app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);  
app.use("/api/userinfo", userInfoRoutes);
app.use("/api/user", userRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
