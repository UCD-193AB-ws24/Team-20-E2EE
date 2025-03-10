import { connectDB, upload } from "../mongo/connection.js";

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

        const db = connectDB.db;
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

export const getUser = async (req, res) => {
    try {
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        const db = connectDB.db;
        const usersCollection = db.collection("users");
        
        const foundUser = await usersCollection.findOne({ uid: uid });

        console.log(foundUser.username);

        if (!foundUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: foundUser });

    } catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateDescription = async (req, res) => {
    try {
        const { description } = req.body;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized - No user ID found" });
        }

        const db = connectDB.db;
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

            const fileUrl = `http://localhost:3000/api/users/get-avatar/${req.file.username}`;

            const db = connectDB.db;
            const usersCollection = db.collection("users");

            const result = await usersCollection.updateOne(
                { uid },
                { $set: { avatar: fileUrl } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).json({ error: "User not found or avatar unchanged" });
            }

            res.json({ message: "Avatar updated successfully", fileId: req.file.id, avatarUrl: fileUrl });
        } catch (error) {
            console.error("Error updating avatar:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
};

export const getAvatar = async (req, res) => {
    try {
        const { username } = req.params;
        const file = await gfs.files.findOne({ username: username });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        const readStream = gfs.createReadStream(file._id);
        res.set("Content-Type", file.contentType);
        readStream.pipe(res);

    } catch (error) {
        console.error("Error retrieving avatar:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
