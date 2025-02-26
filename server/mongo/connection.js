import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
const uri = process.env.ATLAS_URI || "";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function connectDB() {
  try {
    await client.connect();
    // console.log("Connected to MongoDB!");
    return client.db("e2ee_database"); // Return the database instance
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
