const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addExerciseHistory,
    updateExerciseHistory,
    getExerciseHistories,
    getExerciseHistoriesByUser,
    getExerciseHistory,
    deleteExerciseHistory,
    getRadarChartExerciseHistory,
    updateExerciseHistoryBulk,
    deleteDayHistory
} = require("../controllers/exercisehistoryController");

router.get("/radar-chart", requiresAuth, getRadarChartExerciseHistory);
router.get("/fetch", requiresAuth, getExerciseHistories);
router.get("/fetch/user/:id", getExerciseHistoriesByUser);
router.get("/fetch/:id", requiresAuth, getExerciseHistory);
router.post("/add", requiresAuth, addExerciseHistory);
router.post("/temp", requiresAuth, updateExerciseHistoryBulk);
router.put("/update", requiresAuth, updateExerciseHistory);
router.delete("/delete/:id", requiresAuth, deleteExerciseHistory);
router.delete("/delete-day", requiresAuth, deleteDayHistory); 

module.exports = router;