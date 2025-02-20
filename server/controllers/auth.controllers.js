import admin from "../firebaseAdmin.js";

export const register = async (req, res) => {
  const { idToken } = req.body;
  try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userRecord = await admin.auth().getUser(decodedToken.uid);

      // Generate an email verification link
      const emailVerificationLink = await admin.auth().generateEmailVerificationLink(userRecord.email);

      console.log("Email verification link:", emailVerificationLink);

      res.json({
          message: "User registered successfully. Please check your email to verify your account.",
          user: userRecord.toJSON(),
          emailVerificationLink,
      });

  } catch (error) {
      console.error("Error verifying ID token:", error);
      res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

export const login = async (req, res) => {
  const { idToken } = req.body; // Receive ID Token from frontend
  console.log(idToken);

  try {
      // Verify the Firebase ID Token
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Get user details from Firebase
      const userRecord = await admin.auth().getUser(decodedToken.uid);

      // console.log("User authenticated:", userRecord.toJSON());

      if (!userRecord.emailVerified) {
        return res.status(403).json({ error: "Email not verified. Please check your email." });
      } 
      
      res.json({
          message: "User authenticated successfully",
          user: userRecord.toJSON(),
      });

  } catch (error) {
      console.error("Error verifying ID token:", error);
      res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

export const logout = (req, res) => {

};