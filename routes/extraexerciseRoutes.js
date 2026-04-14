const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addExtraExercise,
    getExtraExercise,
    getExtraExercises,
    deleteExtraExercise,
    removeExtraExercise
} = require("../controllers/extraexerciseController.js");

router.get("/fetch", requiresAuth, getExtraExercises);
router.get("/fetch/:id", requiresAuth, getExtraExercise);
router.post("/add", requiresAuth, addExtraExercise);
router.delete("/delete", requiresAuth, deleteExtraExercise);
router.delete("/delete/:id", requiresAuth, removeExtraExercise);

module.exports = router;