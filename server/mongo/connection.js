import mongoose from "mongoose";
import { GridFsStorage } from "multer-gridfs-storage";
import { MongoClient, ServerApiVersion } from "mongodb";
import Grid from "gridfs-stream";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

console.log("MongoDB URI:", process.env.ATLAS_URI);

const uri = process.env.ATLAS_URI || "mongodb+srv://duonghyhenry:Popcornzeppeli12%21@capstonee2ee.ic1rz.mongodb.net/?retryWrites=true&w=majority&appName=CapstoneE2EE" ;

const connectDB = mongoose.createConnection(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs, gridfsBucket;

connectDB.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(connectDB.db, {
    bucketName: "avatars",
  });

  gfs = Grid(connectDB.db, mongoose.mongo);
  gfs.collection("avatars");

  console.log("Connected to MongoDB and GridFS Initialized!");
});

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

export { connectDB, gfs, gridfsBucket, upload };
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});