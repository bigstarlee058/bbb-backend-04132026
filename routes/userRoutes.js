const express = require("express");
const {
  signupUser,
  registerUser,
  signInAdmin,
  getUser,
  getUsers,
  getAllUsers,
  updateUser,
  addUserInfo,
  updateUserSubscription,
  deleteUser,
  getMe,
  exerciseDone,
  dayDone,
  getWorkoutsHistory,
  getUserWorkoutsHistory,
  signInUser,
  verifyUser,
  forgotPassword,
  resetPassword,
  renderResetPasswordPage,
  UpdateAppVersion,
  manageUserSubscription,
  updateSettings,
  updateDeviceInfo,
  getSubscriptionStats,
  resetUserPasswordByAdmin,
  getSubscription,
  generateTempPassword,
  getTempPassword,
  getUserEvents
} = require("../controllers/userController");
const { requiresAuth ,requiresAdmin} = require("../middleware/authMiddleware");
const router = express.Router();
router.get("/:id/events", requiresAuth, getUserEvents);
router.post("/signup_user", signupUser);
router.post("/register_user", registerUser);
router.post("/signin_admin", signInAdmin);
router.post("/signin_mobile", signInUser);
router.post("/forgot_password", forgotPassword);
router.get("/forgot_password_form/:token", renderResetPasswordPage);
router.post("/reset_password", resetPassword);
router.get("/getAllUsers", requiresAuth, getAllUsers);
router.post("/update_app_version", requiresAuth, UpdateAppVersion);

router.get("/admin/:id", requiresAuth, getUser);
router.get("/admin", requiresAuth, getUsers);
router.put("/admin/:id", requiresAuth, updateUser);
router.delete("/admin/:id", requiresAuth, deleteUser);

router.get("/verify/:id", verifyUser);

router.get("/get_user", requiresAuth, getMe);
router.get("/subscription-stats", requiresAuth, getSubscriptionStats);
router.post("/exercise_done", requiresAuth, exerciseDone);
router.post("/day_done", requiresAuth, dayDone);
router.post("/workouts_history", getWorkoutsHistory);
router.get("/workouts_history/:id", getUserWorkoutsHistory);
router.put("/addinfo", requiresAuth, addUserInfo);
router.put("/update_subscription", requiresAuth, updateUserSubscription);
router.put("/manage_subscription", requiresAuth, manageUserSubscription);
router.get("/subscription",requiresAuth,getSubscription);
router.put("/update_settings",requiresAuth, updateSettings);
router.post("/update_device_info",requiresAuth, updateDeviceInfo);
router.put("/:id",requiresAuth, updateUser);
router.post("/admin/:id/reset-password", requiresAuth,requiresAdmin, resetUserPasswordByAdmin);
router.post("/admin/:id/gtp", requiresAuth,requiresAdmin, generateTempPassword);
router.get("/admin/:id/gtp",requiresAuth,requiresAdmin,getTempPassword);

module.exports = router;
