import { connectDB } from "../mongo/connection.js";

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
