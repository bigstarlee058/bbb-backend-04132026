const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addSwapExercise,
    getSwapExercise,
    getSwapExercises,
    deleteSwapExercise,
    removeSwapExercise
} = require("../controllers/swapexerciseController.js");

router.get("/fetch", requiresAuth, getSwapExercises);
router.get("/fetch/:id", requiresAuth, getSwapExercise);
router.post("/add", requiresAuth, addSwapExercise);
router.delete("/delete", requiresAuth, deleteSwapExercise);
router.delete("/delete/:id", requiresAuth, removeSwapExercise);

module.exports = router;