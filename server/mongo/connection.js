import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import mongoose from "mongoose";
import { GridFsStorage } from "multer-gridfs-storage";
import Grid from "gridfs-stream";
import multer from "multer";

dotenv.config();

const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri);

let dbConnection;
let gfs;
let gridfsBucket;

export const connectDB = async () => {
  if (dbConnection) return dbConnection;
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    dbConnection = client.db("e2ee_database");
    
    // Initialize GridFS
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const connection = mongoose.connection;
    connection.once('open', () => {
      gridfsBucket = new mongoose.mongo.GridFSBucket(connection.db, {
        bucketName: "avatars",
      });

      gfs = Grid(connection.db, mongoose.mongo);
      gfs.collection("avatars");

      console.log("GridFS Initialized!");
    });
    
    return dbConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Create storage engine for file uploads
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
    messages: db.collection("messages")
  };
};

export { gfs, upload };