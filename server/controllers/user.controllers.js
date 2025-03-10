import { connectDB, upload, gfs } from "../mongo/connection.js";
import mongoose from "mongoose";

export const updateUsername = async (req, res) => {
    try {
        const { username } = req.body;
        const uid = req.user?.uid; // Extract from Firebase token

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        if (!username || username.trim() === "") {
            return res.status(400).json({ error: "Username cannot be empty" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");
        
        const existingUser = await usersCollection.findOne({ username: username });
        if(existingUser){
            return res.status(409).json({error: "Username already exists"});
        }
        // Update username in MongoDB
        const result = await usersCollection.updateOne(
            { uid: uid },
            { $set: { username: username } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "User not found or username unchanged" });
        }

        res.json({ message: "Username updated successfully" });

    } catch (error) {
        console.error("Error updating username:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const searchUser = async(req, res) => {
    try{
        const { username } = req.query;

        if(!username){
            return res.status(400).json({ error: "Username is required" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        const users = await usersCollection.find({ username: { $regex: username, $options: "i" } }).toArray();

        res.json({ users });
    }catch(error){
        console.error("Error searching user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendFriendRequest = async (req, res) => {
    try {
        const { friendUsername } = req.body;
        const uid = req.user?.uid; // Extract from Firebase token

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        if (!friendUsername) {
            return res.status(400).json({ error: "Friend username is required" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        // Find the current user's document
        const currentUser = await usersCollection.findOne({ uid: uid });
        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        // Find the friend in the database
        const friend = await usersCollection.findOne({ username: friendUsername });
        if (!friend) {
            return res.status(404).json({ error: "Friend not found" });
        }
        
        // Check if the friend is already in the `friends` array
        if (currentUser.friends && currentUser.friends.includes(friend.uid)) {
            return res.status(400).json({ error: "User is already a friend" });
        }
        // Add friend request to friend's `friendRequests` array
        const result = await usersCollection.updateOne(
            { username: friendUsername },
            { $addToSet: { friendsRequests: uid } }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ error: "Friend request already sent" });
        }

        res.json({ message: "Friend request sent successfully" });

    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUser = async (req, res) => {
    try {
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");
        
        const foundUser = await usersCollection.findOne({ uid: uid });

        if (!foundUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: foundUser });

    } catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getFriendRequests = async (req, res) => {  
    try{
        const uid = req.user?.uid;

        if(!uid){
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        const currentUser = await usersCollection.findOne({ uid: uid });
        if(!currentUser){
            return res.status(404).json({ error: "Current user not found" });
        }

        const friendRequests = await usersCollection.find({ uid: { $in: currentUser.friendsRequests || [] } }).toArray();

        res.json({ friendRequests });

    }catch(error){
        console.error("Error getting friend requests:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const acceptFriendRequest = async (req, res) => {
    try {
        const { friendUsername } = req.body;
        const uid = req.user?.uid; // Extract from Firebase token

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        if (!friendUsername) {
            return res.status(400).json({ error: "Friend ID is required" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        // Find the friend by username to get their uid
        const friend = await usersCollection.findOne({ username: friendUsername });

        if (!friend) {
            return res.status(404).json({ error: "Friend not found" });
        }

        const friendUid = friend.uid; // Extract friend's uid

        // Remove the request from the receiver's `friendsRequests` array
        const removeRequest = await usersCollection.updateOne(
            { uid: uid },  // Remove request from the current user's document
            { $pull: { friendsRequests: friendUid } }
        );

        if (removeRequest.modifiedCount === 0) {
            return res.status(400).json({ error: "Friend request not found or already accepted" });
        }

        // Add each other to the `friends` array
        const addFriends = await Promise.all([
            usersCollection.updateOne(
                { uid: uid },
                { $addToSet: { friends: friendUid } }
            ),
            usersCollection.updateOne(
                { username: friendUsername },
                { $addToSet: { friends: uid } }
            )
        ]);

        res.json({ message: "Friend request accepted successfully" });

    } catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteFriendRequest = async (req, res) => {
    try{
        const { friendUsername } = req.body;
        const uid = req.user?.uid;

        if(!uid){
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        if(!friendUsername){
            return res.status(400).json({ error: "Friend username is required" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        const friend = await usersCollection.findOne({ username: friendUsername });
        if(!friend){
            return res.status(404).json({ error: "Friend not found" });
        }

        const friendUid = friend.uid;

        const result = await usersCollection.updateOne(
            { uid: uid },
            { $pull: { friendsRequests: friendUid } }
        );

        if(result.modifiedCount === 0){
            return res.status(400).json({ error: "Friend request not found" });
        }

        res.json({ message: "Friend request deleted successfully" });

    }catch(error){
        console.error("Error deleting friend request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getFriendlist = async (req, res) => {
    try{
        const uid = req.user?.uid;

        if(!uid){
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        const currentUser = await usersCollection.findOne({ uid: uid });
        if(!currentUser){
            return res.status(404).json({ error: "Current user not found" });
        }

        const friends = await usersCollection.find({ uid: { $in: currentUser.friends || [] } }).toArray();

        res.json({ friends });

    }catch(error){
        console.error("Error getting friend list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const updateDescription = async (req, res) => {
    try {
        const { description } = req.body;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");
        
        const result = await usersCollection.updateOne(
            { uid: uid },
            { $set: { description: description } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "User not found or description unchanged" });
        }

        res.json({ message: "Description updated successfully" });

    } catch (error) {
        console.error("Error updating description:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateAvatar = async (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ error: "File upload failed" });
        }

        try {
            const uid = req.user?.uid;
            if (!uid) {
                return res.status(401).json({ error: "Unauthorized - No user ID found" });
            }

            if (!req.file) {
                return res.status(400).json({ error: "No avatar uploaded" });
            }

            const db = await connectDB();
            const usersCollection = db.collection("users");

            const result = await usersCollection.updateOne(
                { uid },
                { $set: { avatar: req.file.id } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).json({ error: "User not found or avatar unchanged" });
            }

            res.json({ message: "Avatar updated successfully", fileId: req.file.id });

        } catch (error) {
            console.error("Error updating avatar:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
};

export const getAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        
        const db = await connectDB();
        const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(id) });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        const readStream = gfs.createReadStream(file._id);
        readStream.pipe(res);

    } catch (error) {
        console.error("Error retrieving avatar:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};