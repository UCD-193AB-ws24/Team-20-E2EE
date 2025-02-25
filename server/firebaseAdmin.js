import admin from "firebase-admin";
import fs from "fs";

// Check if Firebase Admin is already initialized before initializing it again
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(fs.readFileSync("./firebase/serviceAccountKey.json", "utf8"));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

} else {
    console.log("Firebase Admin already initialized, skipping...");
}

// Export the same Firebase Admin instance everywhere in the app
export default admin;
