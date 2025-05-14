import admin from "firebase-admin";
// Check if Firebase Admin is already initialized before initializing it again
if (!admin.apps.length) {
    const serviceAccountJSON = process.env.SERVICE_ACCOUNT_KEY_B64;
    if (!serviceAccountJSON) {
        throw new Error("Missing SERVICE_ACCOUNT_KEY_B64 environment variable.");
    }
    const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountJSON, "base64").toString("utf8")
    );
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} else {
    console.log("Firebase Admin already initialized, skipping...");
}
export default admin;