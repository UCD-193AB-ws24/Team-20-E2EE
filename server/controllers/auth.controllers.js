import admin from "../firebaseAdmin.js";
import { connectDB } from "../mongo/connection.js";

export const register = async (req, res) => {
  const { idToken, userId } = req.body;
  // console.log("User ID:", userId);

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(userRecord.email);

    console.log("Email Link:", emailVerificationLink);
    // Get database instance
    const db = connectDB.db;
    const usersCollection = db.collection("users");

    // Insert user UID into MongoDB if not exists
    const existingUser = await usersCollection.findOne({ uid: userId });
    if (!existingUser) {
      await usersCollection.insertOne({
        uid: userId,
        friends: [],
        friendsRequests: [],
        avatar: "",
        username: "",
        description: "",
        createdAt: new Date(),
      });
      // console.log("User inserted into MongoDB");
    } else {
      console.log("User already exists in MongoDB");
    }

    res.json({
      message: "User registered successfully. Please check your email to verify your account.",
      user: userRecord.toJSON(),
      emailVerificationLink,
    });

  } catch (error) {
    console.error("Error verifying ID token:", error);
    res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

export const login = async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
      return res.status(400).json({ error: "Missing ID token in request body" });
  }

  try {
      console.log("Attempting to verify Firebase ID token...");
      // Verify the Firebase ID Token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log("Token verified successfully for UID:", decodedToken.uid);

      // Get user details from Firebase
      console.log("Fetching user record from Firebase...");
      const userRecord = await admin.auth().getUser(decodedToken.uid);
      console.log("User record retrieved");

      if (!userRecord.emailVerified) {
          return res.status(403).json({ error: "Email not verified. Please check your email." });
      } 

      // Check if username is set in MongoDB
      console.log("Connecting to MongoDB...");
      const db = await connectDB();
      const usersCollection = db.collection("users");
      console.log("Checking if user exists in MongoDB...");
      const existingUser = await usersCollection.findOne({ uid: userRecord.uid });
      console.log("MongoDB user check complete:", existingUser ? "User found" : "User not found");

      const userData = {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName || "",
          username: existingUser?.username || "",
          description: existingUser?.description || "",
          idToken, // Include token for client storage
      };

      if (!existingUser) {
          console.log("User not found in MongoDB, creating new user entry");
          // Create user in MongoDB if not exists
          await usersCollection.insertOne({
              uid: userRecord.uid,
              email: userRecord.email,
              username: "",
              description: "",
              friends: [],
              friendsRequests: [],
              createdAt: new Date(),
          });
          return res.json({
              message: "User authenticated successfully",
              warning: "Please set your username to continue",
              user: userData,
          });
      }

      if (!existingUser.username) {
          console.log("Username not set, user needs to set username");
          return res.json({
              message: "User authenticated successfully",
              warning: "Please set your username to continue",
              user: userData,
          });
      }

      console.log("Authentication successful, returning user data");
      res.json({
          message: "User authenticated successfully",
          user: userData,
      });

  } catch (error) {
      console.error("Error during authentication:", error);
      
      // Add more specific error messages based on error type
      if (error.code === 'auth/id-token-expired') {
          return res.status(401).json({ error: "Authentication token expired. Please log in again." });
      } else if (error.code === 'auth/id-token-revoked') {
          return res.status(401).json({ error: "Authentication token has been revoked. Please log in again." });
      } else if (error.code === 'auth/invalid-id-token') {
          return res.status(401).json({ error: "Invalid authentication token. Please log in again." });
      } else if (error.message && error.message.includes('MongoDB')) {
          return res.status(500).json({ error: "Database error. Please try again later." });
      }
      
      res.status(401).json({ error: `Unauthorized - ${error.message}` });
  }
};


export const logout = (req, res) => {

};