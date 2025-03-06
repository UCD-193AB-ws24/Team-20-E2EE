import UserInfo from "../mongo/models/UserInfo.js";
import { gridfsBucket } from "../mongo/connection.js";
import mongoose from "mongoose";

export const updateUsername = async (req, res) => {
    console.log(req.body);
    try {

        const { email, newUsername } = req.body;

        const updatedUser = await UserInfo.findOneAndUpdate(
            { email },
            { $set: { username: newUsername } },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error("User not found");
        }

        if (!email || !newDescription) {
            return res.status(400).json({ error: "Email and new username are required" });
        }
          
        res.json({ message: "Username updated successfully", user: updatedUser });

    } catch (err) {
        console.error("Error updating username:", err);
        throw err;
    }

}

export const updateDescription = async (req, res) => {
    console.log(req.body);
    try {

        const { email, newDescription } = req.body;

        const updatedUser = await UserInfo.findOneAndUpdate(
            { email },
            { $set: { description: newDescription } },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error("User not found");
        }

        if (!email || !newDescription) {
            return res.status(400).json({ error: "Email and new description are required" });
        }
          
        res.json({ message: "Description updated successfully", user: updatedUser });

    } catch (err) {
        console.error("Error updating description:", err);
        throw err;
    }

}

export const updateAvatar = async (req, res) => {
    console.log(req.body);
    try {
        const { email } = req.body;
        const { newAvatar } = req.file.id;

        const updatedUser = await UserInfo.findOneAndUpdate(
            { email },
            { $set: { avatar: newAvatar } },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error("User not found");
        }

        if (!email || !newAvatar) {
            return res.status(400).json({ error: "Email and new avatar are required" });
        }
          
        res.json({ message: "Avatar updated successfully", user: updatedUser });

    } catch (err) {
        console.error("Error updating avatar:", err);
        throw err;
    }

}

export const getUserFB = async (req, res) => {
    const { idToken } = req.body;
  
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
  
        const userRecord = await admin.auth().getUser(decodedToken.uid);
  
        if (!userRecord.emailVerified) {
          return res.status(403).json({ error: "Email not verified. Please check your email." });
        } 
  
        const db = connectDB.db;
        const usersCollection = db.collection("users");
        const existingUser = await usersCollection.findOne({ uid: userRecord.uid });
  
        const userData = {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName || "",
          username: existingUser?.username || "",
          idToken,
        };
  
        res.json({
            message: "User fetched successfully",
            user: userData,
        });
  
    } catch (error) {
        console.error("Error verifying ID token:", error);
        res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
  };
  

export const getAvatar = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid avatar ID" });
      }
  
      const file = await gridfsBucket.find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
  
      if (!file || file.length === 0) {
        return res.status(404).json({ error: "Avatar not found" });
      }
  
      res.set("Content-Type", file[0].contentType);
      const readStream = gridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(id));
      readStream.pipe(res);
  
    } catch (err) {
      console.error("Error fetching avatar:", err);
      res.status(500).json({ error: err.message });
    }
};

export const getInfo = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await UserInfo.findOne({ email });

        if (!user.username) {
            user.username = "Guest";
        }

        if (!user.avatar) {
            user.avatar = "https://via.placeholder.com/150/FFFFFF/FFFFFF?text=No+Avatar";
        }
        
        if (!user) {
            throw new Error("User not found");
        }

        res.json({ message: "User found", user: user });

    } catch (err) {
        console.error("Error fetching user by email:", err);
        throw err;
    }
}

export const fetchUsers = async (req, res) => {
    try {
        const users = await UserInfo.find();
        res.json({ message: "Users fetched", users: users });
      } catch (err) {
        console.error("Error fetching all users:", err);
        throw err;
      }
}