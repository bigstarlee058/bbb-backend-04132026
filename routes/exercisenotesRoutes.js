const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addExerciseNotes,
    getExerciseNotes,
    getExerciseNoteses,
    deleteExerciseNotes
} = require("../controllers/exercisenotesController.js");

router.get("/fetch", requiresAuth, getExerciseNoteses);
router.get("/fetch/:id", requiresAuth, getExerciseNotes);
router.post("/add", requiresAuth, addExerciseNotes);
router.delete("/delete/:id", requiresAuth, deleteExerciseNotes);

module.exports = router;