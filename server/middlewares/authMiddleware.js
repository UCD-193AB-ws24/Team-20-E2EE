import jwt from "jsonwebtoken";

export const authenticateUser = async (req, res, next) => {
  try {
    // Try to get token from cookie
    let token = req.cookies?.accessToken;

    // If not in cookie, check Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Access token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
};
