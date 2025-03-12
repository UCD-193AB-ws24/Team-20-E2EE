import admin from "../firebaseAdmin.js";
import { connectDB } from "../mongo/connection.js";

export const register = async (req, res) => {
  const { idToken, userId } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(userRecord.email);

    console.log("Email Link:", emailVerificationLink);

    // Ensure DB connection
    const db = await connectDB();
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
      console.log("User inserted into MongoDB");
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

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    if (!userRecord.emailVerified) {
      return res.status(403).json({ error: "Email not verified. Please check your email." });
    }

    // Ensure DB connection
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ uid: userRecord.uid });

    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || "",
      username: existingUser?.username || "",
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