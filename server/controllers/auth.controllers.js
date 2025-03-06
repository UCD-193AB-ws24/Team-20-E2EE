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

  const { idToken } = req.body; // Receive ID Token from frontend

  try {
      // Verify the Firebase ID Token
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Get user details from Firebase
      const userRecord = await admin.auth().getUser(decodedToken.uid);

      if (!userRecord.emailVerified) {
        return res.status(403).json({ error: "Email not verified. Please check your email." });
      } 

      // Check if username is set in MongoDB
      const db = connectDB.db;
      const usersCollection = db.collection("users");
      const existingUser = await usersCollection.findOne({ uid: userRecord.uid });

      const userData = {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || "",
        username: existingUser?.username || "", // Ensure we fetch username from MongoDB
        description: userRecord.description,
        idToken,
      };

      if (!existingUser?.username) {
        return res.json({
          message: "User authenticated successfully",
          warning: "Please set your username to continue",
          user: userData,
        });
      }

      res.json({
          message: "User authenticated successfully",
          user: userData,
      });

  } catch (error) {
      console.error("Error verifying ID token:", error);
      res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};


export const logout = (req, res) => {

};