const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
exports.requiresAuth = async (req, res, next) => {
  const token = req.headers["auth_token"];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.WOOCOMMERCE_JWT_AUTH_SECURITY_KEY,
      {clockTolerance: 10}
    );

    const userData = decoded?.data?.user;
    if (!userData)
      return res.status(401).json({ error: "Invalid token payload" });

    if (userData.createdAt) {
      req.user = userData;
    } else if (userData.id && userData.id !== -1) {
      const user = await User.findOne({uid:userData.id})
      req.user = user
      req.user.uid = userData.id
    } else {
      req.user = { _id: userData.userId };
    }

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
exports.requiresAdmin = async (req, res, next) => {
  if (req.user.role < 1) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}