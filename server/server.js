import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import admin from "./firebaseAdmin.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();
console.log("MongoDB URI in server.js:", process.env.ATLAS_URI);


import { connectDB } from "./mongo/connection.js";


const app = express();
const PORT = process.env.PORT || 3000;

connectDB.once("open", () => {
  console.log("Connected to MongoDB");
});

app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Replace with your frontend URL
      methods: "GET, POST, PUT, DELETE", // Allow GET and POST requests
      allowedHeaders: "Content-Type,Authorization", // Allow Content-Type header
    })
  );

app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);  
app.use("/api/user", userRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
