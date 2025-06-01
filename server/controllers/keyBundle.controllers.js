import { connectDB } from "../mongo/connection.js";
import { ObjectId } from "mongodb";

// Store a user's key bundle
export const storeKeyBundle = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const keyBundle = req.body;
    const forceOverwrite = keyBundle.forceOverwrite === true;
    
    // Remove the flag from the bundle before storing
    delete keyBundle.forceOverwrite;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    // Validate the key bundle
    if (!keyBundle || !keyBundle.registrationId || !keyBundle.identityPubKey || 
        !keyBundle.signedPreKeyId || !keyBundle.signedPreKeyPub || 
        !keyBundle.signedPreKeySignature || !keyBundle.preKeys || !keyBundle.deviceId) {
      return res.status(400).json({ error: "Invalid key bundle format" });
    }

    const db = await connectDB();
    const keyBundlesCollection = db.collection("keyBundles");

    // Check if this device already has a key bundle
    const existingBundle = await keyBundlesCollection.findOne({ 
      uid,
      deviceId: keyBundle.deviceId
    });

    // If bundle exists and we're not forcing overwrite, return early
    if (existingBundle && !forceOverwrite) {
      console.log(`Key bundle already exists for user ${uid} on device ${keyBundle.deviceId}`);
      return res.status(200).json({ message: "Key bundle already exists for this device" });
    }

    // Store or update the key bundle
    const result = await keyBundlesCollection.updateOne(
      { uid, deviceId: keyBundle.deviceId },
      { $set: { ...keyBundle, updatedAt: new Date() } },
      { upsert: true }
    );

    if (result.acknowledged) {
      const action = existingBundle ? "updated" : "stored";
      return res.status(200).json({ message: `Key bundle ${action} successfully` });
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

    // Find the user by username
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get their key bundle with atomic prekey removal
    const keyBundle = await keyBundlesCollection.findOneAndUpdate(
      { 
        uid: user.uid,
        preKeys: { $exists: true, $not: { $size: 0 } } // Only if preKeys array exists and is not empty
      },
      {
        $pop: { preKeys: -1 }, // Remove the first prekey atomically
        $set: { updatedAt: new Date() }
      },
      {
        returnDocument: 'before' // Return the document before modification
      }
    );

    if (!keyBundle || !keyBundle.preKeys || keyBundle.preKeys.length === 0) {
      return res.status(410).json({ 
        error: "No prekeys available - user needs to replenish prekeys" 
      });
    }

    // Create response bundle with the consumed prekey
    const consumedPrekey = keyBundle.preKeys[0];
    const responseBundle = {
      uid: keyBundle.uid,
      deviceId: keyBundle.deviceId,
      registrationId: keyBundle.registrationId,
      identityPubKey: keyBundle.identityPubKey,
      signedPreKeyId: keyBundle.signedPreKeyId,
      signedPreKeyPub: keyBundle.signedPreKeyPub,
      signedPreKeySignature: keyBundle.signedPreKeySignature,
      preKeys: [consumedPrekey] // Only return the consumed prekey
    };

    console.log(`Consumed prekey ${consumedPrekey.keyId} for user ${username}. Remaining prekeys: ${keyBundle.preKeys.length - 1}`);

    // Remove MongoDB specific fields
    delete responseBundle._id;

    return res.status(200).json({ keyBundle: responseBundle });
  } catch (error) {
    console.error("Error retrieving key bundle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get ALL key bundles for a user (for multi-device support)
export const getUserKeyBundles = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const keyBundlesCollection = db.collection("keyBundles");

    // Find the user by username
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get ALL key bundles for this user (all devices)
    const keyBundles = await keyBundlesCollection.find({ uid: user.uid }).toArray();
    
    if (!keyBundles || keyBundles.length === 0) {
      return res.status(404).json({ error: "No key bundles found for this user" });
    }

    // Process each device's key bundle and consume one prekey
    const deviceBundles = [];
    
    for (const bundle of keyBundles) {
      if (!bundle.preKeys || bundle.preKeys.length === 0) {
        console.warn(`No prekeys available for device ${bundle.deviceId} of user ${username}`);
        continue; // Skip devices with no prekeys
      }

      // Atomically remove one prekey from this device
      const updatedBundle = await keyBundlesCollection.findOneAndUpdate(
        { 
          _id: bundle._id,
          preKeys: { $exists: true, $not: { $size: 0 } }
        },
        {
          $pop: { preKeys: -1 },
          $set: { updatedAt: new Date() }
        },
        {
          returnDocument: 'before'
        }
      );

      if (updatedBundle && updatedBundle.preKeys && updatedBundle.preKeys.length > 0) {
        const consumedPrekey = updatedBundle.preKeys[0];
        
        const deviceBundle = {
          uid: updatedBundle.uid,
          deviceId: updatedBundle.deviceId,
          registrationId: updatedBundle.registrationId,
          identityPubKey: updatedBundle.identityPubKey,
          signedPreKeyId: updatedBundle.signedPreKeyId,
          signedPreKeyPub: updatedBundle.signedPreKeyPub,
          signedPreKeySignature: updatedBundle.signedPreKeySignature,
          preKeys: [consumedPrekey]
        };

        delete deviceBundle._id;
        deviceBundles.push(deviceBundle);
        
        console.log(`Consumed prekey ${consumedPrekey.keyId} for device ${updatedBundle.deviceId} of user ${username}`);
      }
    }

    if (deviceBundles.length === 0) {
      return res.status(410).json({ 
        error: "No prekeys available on any device - user needs to replenish prekeys" 
      });
    }

    return res.status(200).json({ 
      keyBundles: deviceBundles,
      deviceCount: deviceBundles.length 
    });
  } catch (error) {
    console.error("Error retrieving user key bundles:", error);
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

// Check if a key bundle exists for a user's device
export const checkKeyBundle = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const { deviceId } = req.query;

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized - No user ID found" });
    }

    if (!deviceId) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    const db = await connectDB();
    const keyBundlesCollection = db.collection("keyBundles");

    const keyBundle = await keyBundlesCollection.findOne({ uid, deviceId });
    
    return res.status(200).json({ 
      exists: !!keyBundle,
      needsKeyBundle: !keyBundle
    });
  } catch (error) {
    console.error("Error checking key bundle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const checkDeviceKeyConsistency = async (req, res) => {
    try {
      const uid = req.user?.uid;
      const deviceId = req.query.deviceId;
  
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized - No user ID found" });
      }
  
      const db = await connectDB();
      const keyBundlesCollection = db.collection("keyBundles");
  
      // Check if this exact device has keys
      const keyBundle = await keyBundlesCollection.findOne({ 
        uid, 
        deviceId 
      });
  
      return res.status(200).json({
        hasKeysOnServer: !!keyBundle
      });
    } catch (error) {
      console.error("Error checking device key consistency:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };