import admin from "../firebaseAdmin.js";

export const register = async (req, res) => {
    console.log(req.body);
    const user = {
      email: req.body.email,
      password: req.body.password
    }
    try {
      const userResponse = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        emailVerified: false, 
        disabled: false
      });
  
      const emailVerificationLink = await admin.auth().generateEmailVerificationLink(user.email);
  
      console.log("Email verification link:", emailVerificationLink);
  
      res.json({
        message: "User created successfully. Please check your email to verify your account.",
        user: userResponse
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
};

export const login = async (req, res) => {
  const { idToken } = req.body; // Receive ID Token from frontend

  try {
      // Verify the Firebase ID Token
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Get user details from Firebase
      const userRecord = await admin.auth().getUser(decodedToken.uid);

      console.log("User authenticated:", userRecord.toJSON());

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