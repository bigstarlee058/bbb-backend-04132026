const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addAchievements,
    getAchievement,
    getAchievements,
    deleteAchievement,
} = require("../controllers/achievementsController.js");

router.get("/fetch", requiresAuth, getAchievements);
router.get("/fetch/:id", requiresAuth, getAchievement);
router.post("/add", requiresAuth, addAchievements);
router.delete("/delete/:id", requiresAuth, deleteAchievement);

module.exports = router;