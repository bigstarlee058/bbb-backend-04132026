const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getMonthEnrollment
} = require("../controllers/monthenrollmentController.js");

router.get("/fetch", requiresAuth, getMonthEnrollment);

module.exports = router;