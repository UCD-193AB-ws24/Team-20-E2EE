const express = require("express");
const cors = require("cors");
require("dotenv").config();

const admin = require("firebase-admin");
const credentials = require("./firebase/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173", // Replace with your frontend URL
      methods: "GET,POST", // Allow GET and POST requests
      allowedHeaders: "Content-Type",
    })
  );

app.post("/api/message", (req, res) => {
    const { message } = req.body;
    console.log("Received message:", message);
    res.json({ response: `Message Received: ${message}` });
});

app.post("/signup", async (req, res) => {
  console.log(req.body);
  const user = {
    email: req.body.email,
    password: req.body.password
  }
  try {
    const userResponse = await admin.auth().createUser({
      email: user.email,
      password: user.password,
      emailVerified: false, 
      disabled: false
    });

    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(user.email);

    console.log("Email verification link:", emailVerificationLink);

    res.json({
      message: "User created successfully. Please check your email to verify your account.",
      user: userResponse
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message });
  }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
