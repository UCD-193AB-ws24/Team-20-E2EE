import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
// const admin = require("firebase-admin");
// const credentials = require("./firebase/serviceAccountKey.json");


// admin.initializeApp({
//   credential: admin.credential.cert(credentials)
// });
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
