import admin from "../firebaseAdmin.js";
import { connectDB } from "../mongo/connection.js";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();


export const register = async (req, res) => {
  const { email, password } = req.body;
  try {
    const firebaseUser = await admin.auth().createUser({
      email: email,
    });

    // Verify the ID token
    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(email);

    console.log("Email Link:", emailVerificationLink);

    // Ensure DB connection
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const authCollection = db.collection("auth");

    // Insert user UID into MongoDB if not exists
    const existingUser = await authCollection.findOne({email: email});

    const hashedPassword = await bcrypt.hash(password, Number(process.env.HASH_ROUNDS || 10));
    
    if (!existingUser) {
      const authResult = await authCollection.insertOne({
        email: email,
        password: hashedPassword,
        emailVerified: false,
        loginMethod: "traditional",
        createdAt: new Date(),
      });

      const userId = authResult.insertedId.toString();
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
      user: email,
      emailVerificationLink,
    });

  } catch (error) {
    console.log("Error registering user:", error);

    res.status(401).json({ error: error.message });
  }
};

export const corbadoLogin = async (req, res) => {
  try {
    const email = req.body.email;
    console.log("Email from Corbado:", email);
    if (!email) return res.status(400).json({ error: "Invalid token: no email" });

    const db = await connectDB();
    const authCollection = db.collection("auth");
    const usersCollection = db.collection("users");

    let auth = await authCollection.findOne({ email });
    if (!auth) {
      const result = await authCollection.insertOne({ email, createdAt: new Date(), emailVerified: true, loginMethod: "corbado" });
      auth = { _id: result.insertedId, email, emailVerified: true, loginMethod: "corbado" };

      await usersCollection.insertOne({
        uid: result.insertedId.toString(),
        friends: [],
        friendsRequests: [],
        avatar: "",
        username: "",
        description: "",
        createdAt: new Date(),
      });
    }

    const user = await usersCollection.findOne({ uid: auth._id.toString() });

    const accessToken = jwt.sign({ uid: auth._id.toString() }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ uid: auth._id.toString() }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 3600000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 604800000,
    });

    const userData = {
      uid: user.uid,
      email,
      username: user.username || "",
      emailVerified: true,
      loginMethod: "corbado",
      description: user.description,
    };

    if (!user.username) {
      return res.json({
        message: "User authenticated successfully",
        warning: "Please set your username to continue",
        user: userData,
      });
    }

    return res.status(200).json({
      message: "User authenticated successfully",
      user: userData,
    });

  } catch (error) {
    console.error("Error in corbadoLogin:", error);
    return res.status(500).json({ error: error.message });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let emailVerified = false;

    // Ensure DB connection
    const db = await connectDB();
    const authCollection = db.collection("auth");
    const auth = await authCollection.findOne({ email: email});
    if (!auth ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, auth.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }



    if (!auth ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    if (!userRecord) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (userRecord.emailVerified === false) {
        return res.status(403).json({ error: "Email not verified. Please check your email." });
    }else if(userRecord.emailVerified === true){
        await authCollection.updateOne({email: email}, {$set: {emailVerified: true}});
        emailVerified = true;
    }

    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ uid: auth._id.toString() });

    const accessToken = jwt.sign({ uid: user.uid}, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ uid: user.uid}, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    // HttpOnly cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false, // true in production with HTTPS
      sameSite: "Lax",
      maxAge: 3600000 // 1 hour
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // true in production with HTTPS
      sameSite: "Lax",
      maxAge: 604800000 // 7 days
    });

    const userData = {
      uid: user.uid,
      email: email,
      emailVerified: emailVerified,
      username: user.username || "",
      description: user.description,
      loginMethod: "traditional",
    };

    if (!user?.username) {
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
    console.error("Error:", error.message);
    res.status(401).json({ error: error.message });
  }
};


export const logout = async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "User logged out successfully" });
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET);
    const uid = decodedToken.uid;

    // Generate a new token
    const newAccessToken = jwt.sign({ uid: uid }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
    
    // Set the new access token as a cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false, // set to true in production (HTTPS)
      sameSite: "Lax",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({message: "Access Token Refreshed" });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};