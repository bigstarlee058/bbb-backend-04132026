const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addExtraSet,
    getExtraSet,
    getExtraSets,
    deleteExtraSet
} = require("../controllers/extrasetController.js");

router.get("/fetch", requiresAuth, getExtraSets);
router.get("/fetch/:id", requiresAuth, getExtraSet);
router.post("/add", requiresAuth, addExtraSet);
router.delete("/delete/:id", requiresAuth, deleteExtraSet);

module.exports = router;