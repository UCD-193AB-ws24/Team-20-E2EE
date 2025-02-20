import UserInfo from "../mongo/models/UserInfo.js";

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
            return res.status(400).json({ error: "Email and new avatar are required" });
        }
          
        res.json({ message: "Description updated successfully", user: updatedUser });

    } catch (err) {
        console.error("Error updating description:", err);
        throw err;
    }

}

export const updateAvatar = async (email, newAvatar) => {
    console.log(req.body);
    try {
        const { email, newAvatar } = req.body;

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

export const getInfo = async (req, res) => {
    try {
        const user = await UserInfo.findOne({ email });
        
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
