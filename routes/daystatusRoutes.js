const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addDayStatus,
    updateDayStatus,
    getDayStatus,
    getDayStatuses,
    deleteDayStatus
} = require("../controllers/daystatusController.js");

router.get("/fetch", requiresAuth, getDayStatuses);
router.get("/fetch/:id", requiresAuth, getDayStatus);
router.post("/add", requiresAuth, addDayStatus);
router.put("/update", requiresAuth, updateDayStatus);
router.delete("/delete/:id", requiresAuth, deleteDayStatus);

module.exports = router;