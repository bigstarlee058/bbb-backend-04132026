const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addDayStatusList,
    getDayStatusList,
    getDayStatusLists,
    deleteDayStatusList
} = require("../controllers/daystatuslistController.js");

router.get("/fetch", requiresAuth, getDayStatusLists);
router.get("/fetch/:id", requiresAuth, getDayStatusList);
router.post("/add", requiresAuth, addDayStatusList);
router.delete("/delete/:id", requiresAuth, deleteDayStatusList);

module.exports = router;