import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true},
  avatar: { type: String, required: true },
  description: { type: String, required: true },
});

const UserInfo = mongoose.model("UserInfo", userSchema);
export default UserInfo;
