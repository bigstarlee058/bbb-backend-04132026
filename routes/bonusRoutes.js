const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    addBonusAdmin,
    updateBonusAdmin,
    deleteBonusAdmin,
    getBonusesAdmin,
    getBonuses,
    getFeaturedBonuses,
    getBonusAdmin,
    getBonusTitlesAdmin,
} = require("../controllers/bonusController");

router.get("/admin/get", requiresAuth, getBonusesAdmin);
router.get("/get", requiresAuth, getBonuses);
router.get("/get-featured", requiresAuth, getFeaturedBonuses);
router.get("/admin/get/:id", requiresAuth, getBonusAdmin);
router.get("/get/:id", requiresAuth, getBonusAdmin);
router.post("/admin", requiresAuth, addBonusAdmin);
router.put("/admin", requiresAuth, updateBonusAdmin);
router.delete("/admin/:id", requiresAuth, deleteBonusAdmin);
router.get("/admin/titlefilter", getBonusTitlesAdmin);

module.exports = router;