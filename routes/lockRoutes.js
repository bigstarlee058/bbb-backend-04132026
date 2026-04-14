const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");
const {
  acquireLock,
  heartbeat,
  releaseLock,
  checkLock,
} = require("../controllers/lockController");

router.post("/acquire", requiresAuth, acquireLock);
router.put("/heartbeat", requiresAuth, heartbeat);
router.delete("/release", requiresAuth, releaseLock);
router.get("/check", requiresAuth, checkLock);

module.exports = router;