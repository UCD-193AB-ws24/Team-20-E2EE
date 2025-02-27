import admin from "../firebaseAdmin.js"; // Import initialized Firebase Admin

// Middleware to verify Firebase ID Token
export const authenticateUser = async (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract Bearer token
    if (!token) {
        return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Attach user data to request
        next(); // Proceed to next middleware
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
};
