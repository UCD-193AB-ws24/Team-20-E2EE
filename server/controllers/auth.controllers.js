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

export const login = (req, res) => {


};

export const logout = (req, res) => {

};