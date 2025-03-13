import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
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
      dbName: "e2ee_database",
    });

    dbConnection = mongoose.connection;
    console.log("Connected to MongoDB: ", mongoose.connection.name);

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
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Function to manually store file in GridFS
const storeFileInGridFS = async (file) => {
    const db = await connectDB();
    const bucket = new GridFSBucket(db, { bucketName: "avatars" });

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname, {
            chunkSizeBytes: 1024 * 255,
            metadata: { mimetype: file.mimetype },
        });

        uploadStream.end(file.buffer);
        
        uploadStream.on("finish", () => {
            console.log("File uploaded to GridFS:", uploadStream.id);
            resolve(uploadStream.id);
        });

        uploadStream.on("error", (err) => {
            console.error("GridFS upload error:", err);
            reject(err);
        });
    });
};

const connectToGridFS = async () => {
  if (gridfsBucket) {
      console.log("GridFSBucket already initialized.");
      return;
  }

  try {
      await connectDB(); 
      
      dbConnection = mongoose.connection;
      gridfsBucket = new mongoose.mongo.GridFSBucket(dbConnection.db, {
        bucketName: "avatars",
      });
      
      console.log("GridFSBucket initialized.");
  } catch (error) {
      console.error("Error initializing GridFSBucket:", error);
      throw error;
  }
};

const disconnectFromGridFS = async () => {
    try {
        console.log("Disconnecting from GridFS...");
        gridfsBucket = null;
    } catch (error) {
        console.error("Error disconnecting from GridFS:", error);
    }
};


// Helper function to get collections
export const getCollections = async () => {
  const db = await connectDB();
  return {
    users: db.collection("users"),
    messages: db.collection("messages"),
  };
};

export { gfs, upload, gridfsBucket, storeFileInGridFS, connectToGridFS, disconnectFromGridFS };
