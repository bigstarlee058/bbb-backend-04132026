const jwt = require("jsonwebtoken");

exports.adminAuth = (req, res, next) => {
  const token = req.headers["auth_token"];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET);

    const userData = decoded?.data?.user;
    if (!userData)
      return res.status(401).json({ error: "Invalid token payload" });

    if (!userData.role || userData.role !== 1) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
