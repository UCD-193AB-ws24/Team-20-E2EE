import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import admin from "firebase-admin";
import fs from "fs";
const credentials = JSON.parse(fs.readFileSync("./firebase/serviceAccountKey.json", "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Replace with your frontend URL
      methods: "GET,POST", // Allow GET and POST requests
      allowedHeaders: "Content-Type",
    })
  );

app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);  

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
