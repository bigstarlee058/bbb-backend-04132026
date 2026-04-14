const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addExerciseStatus,
    updateExerciseStatus,
    getExerciseStatus,
    getExerciseStatuses,
    getExerciseStatusByUser,
    deleteExerciseStatus
} = require("../controllers/exercisestatusController.js");

router.get("/fetch", requiresAuth, getExerciseStatuses);
router.get("/fetch/user/:id", getExerciseStatusByUser);
router.get("/fetch/:id", requiresAuth, getExerciseStatus);
router.post("/add", requiresAuth, addExerciseStatus);
router.put("/update", requiresAuth, updateExerciseStatus);
router.delete("/delete/:id", requiresAuth, deleteExerciseStatus);

module.exports = router;