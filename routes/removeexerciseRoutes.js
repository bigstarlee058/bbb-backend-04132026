const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addRemoveExercise,
    deleteRemoveExercise,
    getRemoveExercises,
    getRemoveExercise,
    removeRemoveExercise
} = require("../controllers/removeexerciseController.js");

router.get("/fetch", requiresAuth, getRemoveExercises);
router.get("/fetch/:id", requiresAuth, getRemoveExercise);
router.post("/add", requiresAuth, addRemoveExercise);
router.delete("/delete", requiresAuth, deleteRemoveExercise);
router.delete("/delete/:id", requiresAuth, removeRemoveExercise);

module.exports = router;