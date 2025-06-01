import admin from "../firebaseAdmin.js";
import nodemailer from 'nodemailer';
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

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"EMA" <no-reply@yourapp.com>',
      to: email,
      subject: "Verify your email",
      html: `<p>Click <a href="${emailVerificationLink}">here</a> to verify your email.</p>`,
    });

    // Ensure DB connection
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const authCollection = db.collection("auth");

    // Insert user UID into MongoDB if not exists
    const existingUser = await authCollection.findOne({ email: email });

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
    console.error("Registration error:", {
      error: error.message,
      code: error.code,
      email: email
    });

    res.status(401).json({ error: error.message });
  }
};


export const resetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    await admin.auth().getUserByEmail(email);

    const actionCodeSettings = {
      url: "https://ema-chat.com/reset",
      handleCodeInApp: true,
    };

    const db = await connectDB();

    const userInDb = await db.collection('auth').findOne({ email: email });

    if (!userInDb || userInDb.loginMethod !== "traditional") {
      return res.status(400).json({ error: "This account uses passkey login. Password reset not available." });
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    const url = new URL(resetLink);
    const oobCode = url.searchParams.get("oobCode");
    const customLink = `https://ema-chat.com/reset?oobCode=${oobCode}`;

    console.log("Reset Link: ", resetLink);
    console.log("Custom Link: ", customLink);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"EMA" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${customLink}">Click here to reset your password</a></p>
        <p>This link will expire soon. If you didn't request this, please ignore it.</p>
      `,
    });

    res.json({ message: "Password reset email sent." });

  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to send password reset link." });
  }
};

export const updatePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const db = await connectDB();
    const user = await db.collection("auth").findOne({ email });

    if (!user || user.loginMethod !== "traditional") {
      return res.status(400).json({ error: "Invalid account type for password reset." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.collection("auth").updateOne(
      { email },
      { $set: { password: hashed } }
    );

    res.json({ message: "MongoDB password updated." });
  } catch (err) {
    console.error("MongoDB password update failed:", err);
    res.status(500).json({ error: "Password update failed." });
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
    if (!user) {
      console.error("User not found after auth:", email);
      return res.status(500).json({ error: "Internal server error" });
    }

    const accessToken = jwt.sign({ uid: auth._id.toString() }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ uid: auth._id.toString() }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 3600000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 604800000,
    });

    const keyBundlesCollection = db.collection("keyBundles");
    const keyBundleExists = await keyBundlesCollection.findOne({
      uid: user.uid
    });

    const userData = {
      uid: user.uid,
      email,
      username: user.username || "",
      emailVerified: true,
      loginMethod: "corbado",
      description: user.description,
      needsKeyBundle: !keyBundleExists,
    };

    if (!user.username) {
      return res.json({
        message: "User authenticated successfully",
        warning: "Please set your username to continue",
        user: userData, accessToken
      });
    }

    return res.status(200).json({
      message: "User authenticated successfully",
      user: userData, accessToken
    });

  } catch (error) {
    console.error("Corbado login error:", {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    return res.status(500).json({
      error: "Authentication failed",
      details: error.message
    });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let emailVerified = false;

    // Ensure DB connection
    const db = await connectDB();
    const authCollection = db.collection("auth");
    const auth = await authCollection.findOne({ email: email });
    if (!auth) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, auth.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }



    if (!auth) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    if (!userRecord) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (userRecord.emailVerified === false) {
      return res.status(403).json({ error: "Email not verified. Please check your email." });
    } else if (userRecord.emailVerified === true) {
      await authCollection.updateOne({ email: email }, { $set: { emailVerified: true } });
      emailVerified = true;
    }

    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ uid: auth._id.toString() });

    const accessToken = jwt.sign({ uid: user.uid }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ uid: user.uid }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    // HttpOnly cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true, // true in production with HTTPS
      sameSite: "None",
      maxAge: 3600000 // 1 hour
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // true in production with HTTPS
      sameSite: "None",
      maxAge: 604800000 // 7 days
    });

    const keyBundlesCollection = db.collection("keyBundles");
    const keyBundleExists = await keyBundlesCollection.findOne({ uid: user.uid });

    const userData = {
      uid: user.uid,
      email: email,
      emailVerified: emailVerified,
      username: user.username || "",
      description: user.description,
      loginMethod: "traditional",
      needsKeyBundle: !keyBundleExists,
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
      secure: true, // set to true in production (HTTPS)
      sameSite: "None",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({ message: "Access Token Refreshed" });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};