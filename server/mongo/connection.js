import mongoose from "mongoose";
import { GridFsStorage } from "multer-gridfs-storage";
import Grid from "gridfs-stream";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.ATLAS_URI;
let dbConnection;
let gfs;
let gridfsBucket;

// Connect to MongoDB using Mongoose
export const connectDB = async () => {
  if (dbConnection) return dbConnection;

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    dbConnection = mongoose.connection;
    console.log("Connected to MongoDB");

    dbConnection.once("open", () => {
      gridfsBucket = new mongoose.mongo.GridFSBucket(dbConnection.db, {
        bucketName: "avatars",
      });

      gfs = Grid(dbConnection.db, mongoose.mongo);
      gfs.collection("avatars");

      console.log("GridFS Initialized!");
    });

    return dbConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Create storage engine for file uploads (GridFS)
const storage = new GridFsStorage({
  url: uri,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: "avatars",
    };
  },
});

const upload = multer({ storage });

// Helper function to get collections
export const getCollections = async () => {
  const db = await connectDB();
  return {
    users: db.collection("users"),
    messages: db.collection("messages"),
  };
};

export { gfs, upload, gridfsBucket };
