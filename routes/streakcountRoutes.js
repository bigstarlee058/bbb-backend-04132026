const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getStreakCount,
  updateStreakCount
} = require("../controllers/streakcountController.js");

router.get("/fetch", requiresAuth, getStreakCount);
router.put("/update", requiresAuth, updateStreakCount);

module.exports = router;