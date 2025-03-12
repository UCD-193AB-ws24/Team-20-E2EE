import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri);

let dbConnection;

export const connectDB = async () => {
  if (dbConnection) return dbConnection;
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    dbConnection = client.db("e2ee_database");
    return dbConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Helper function to get collections
export const getCollections = async () => {
  const db = await connectDB();
  return {
    users: db.collection("users"),
    messages: db.collection("messages")
  };
};