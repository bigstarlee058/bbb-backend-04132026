const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getPopupWorkout,
  updatePopupWorkout,
} = require("../controllers/popupworkoutController.js");

router.get("/", requiresAuth, getPopupWorkout);
router.put("/", requiresAuth, updatePopupWorkout);

router.get("/get_popupworkout", getPopupWorkout);

module.exports = router;
