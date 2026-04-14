const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");
const {
  getWorkouts,
  getWorkoutById,
  updateWorkouts,
  getWorkoutForCurrentMonth,
  checkSubscription,
  imageUrlGenerator,
  updateMonths,
  getVideoUrlfromVimeoId,
  workoutCurrentMonth
} = require("../controllers/workoutsController");
const User = require("../models/userModel");

const fetchUserSettings = async (req, res, next) => {
  try {
    const possibleId = req.user?._id || req.user?.uid || req.user?.id;

    if (!possibleId) {
      req.userSettings = { weekStartDay: "monday" };
      return next();
    }

    const user = await User.findById(possibleId).select("settings.weekStartDay").lean();
    req.userSettings = { weekStartDay: user?.settings?.weekStartDay || "monday" };
    next();
  } catch (err) {
    req.userSettings = { weekStartDay: "monday" };
    next();
  }
};

router.get("/getVideoUrl/:id", requiresAuth, getVideoUrlfromVimeoId);

router.get("/", requiresAuth, getWorkouts);
router.put("/update", requiresAuth, updateWorkouts);
router.post("/customize", requiresAuth, updateMonths);
router.post("/current", requiresAuth, fetchUserSettings, getWorkoutForCurrentMonth);
router.post("/v2/current", requiresAuth, fetchUserSettings, workoutCurrentMonth);
router.post("/checkSubscription",requiresAuth, checkSubscription);
router.post("/upload",requiresAuth, imageUrlGenerator);
router.get("/:id", requiresAuth, getWorkoutById);
module.exports = router;
