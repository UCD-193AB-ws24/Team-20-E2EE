import { connectDB } from "../mongo/connection.js";
import { ObjectId } from "mongodb";

// Store a user's key bundle
export const storeKeyBundle = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const keyBundle = req.body;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    // Validate the key bundle
    if (!keyBundle || !keyBundle.registrationId || !keyBundle.identityPubKey || 
        !keyBundle.signedPreKeyId || !keyBundle.signedPreKeyPub || 
        !keyBundle.signedPreKeySignature || !keyBundle.preKeys) {
      return res.status(400).json({ error: "Invalid key bundle format" });
    }

    const db = await connectDB();
    const keyBundlesCollection = db.collection("keyBundles");

    // Store or update the key bundle
    const result = await keyBundlesCollection.updateOne(
      { uid },
      { $set: { ...keyBundle, updatedAt: new Date() } },
      { upsert: true }
    );

    if (result.acknowledged) {
      return res.status(200).json({ message: "Key bundle stored successfully" });
    } else {
      return res.status(500).json({ error: "Failed to store key bundle" });
    }
  } catch (error) {
    console.error("Error storing key bundle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get a user's key bundle by their username
export const getKeyBundle = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const keyBundlesCollection = db.collection("keyBundles");

    // First, find the user by username
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Then, get their key bundle
    const keyBundle = await keyBundlesCollection.findOne({ uid: user.uid });
    if (!keyBundle) {
      return res.status(404).json({ error: "Key bundle not found for this user" });
    }

    // Remove MongoDB specific fields
    delete keyBundle._id;

    return res.status(200).json({ keyBundle });
  } catch (error) {
    console.error("Error retrieving key bundle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a user's key bundle (used for account deletion or key rotation)
export const deleteKeyBundle = async (req, res) => {
  try {
    const uid = req.user?.uid;
    
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    const db = await connectDB();
    const keyBundlesCollection = db.collection("keyBundles");

    const result = await keyBundlesCollection.deleteOne({ uid });
    
    if (result.deletedCount > 0) {
      return res.status(200).json({ message: "Key bundle deleted successfully" });
    } else {
      return res.status(404).json({ error: "Key bundle not found" });
    }
  } catch (error) {
    console.error("Error deleting key bundle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};