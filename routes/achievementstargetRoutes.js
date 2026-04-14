const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addAchievementsTargetAdmin,
    updateAchievementsTargetAdmin,
    deleteAchievementsTargetAdmin,
    getAchievementsTargetsAdmin,
    getAllAchievementsTargets,
    getAchievementsTargetAdmin,
    getAchievementsTargetTitlesAdmin,
} = require("../controllers/achievementstargetController.js");

router.get("/admin/get", requiresAuth, getAchievementsTargetsAdmin);
router.get("/get", requiresAuth, getAllAchievementsTargets);
router.get("/admin/get/:id", requiresAuth, getAchievementsTargetAdmin);
router.get("/get/:id", requiresAuth, getAchievementsTargetAdmin);
router.post("/admin", requiresAuth, addAchievementsTargetAdmin);
router.put("/admin", requiresAuth, updateAchievementsTargetAdmin);
router.delete("/admin/:id", requiresAuth, deleteAchievementsTargetAdmin);
router.get("/admin/titlefilter", getAchievementsTargetTitlesAdmin);

module.exports = router;