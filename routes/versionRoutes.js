const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getVersion,
  updateVersion,
} = require("../controllers/versionController.js");

router.get("/", requiresAuth, getVersion);
router.put("/", requiresAuth, updateVersion);

router.get("/get_version", getVersion);

module.exports = router;
