const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    getPhasesAdmin,
    getPhasesMainInfo,
    getPhaseAdmin,
    getAllPhases,
    addPhasesAdmin,
    updatePhasesAdmin,
    updatePhasesMaininfo,
    deletePhasesAdmin,
} = require("../controllers/phasesController.js");

router.get("/admin/get", requiresAuth, getPhasesAdmin);
router.get("/admin/maininfo", requiresAuth, getPhasesMainInfo);
router.get("/admin/get/:id", requiresAuth, getPhaseAdmin);
router.post("/admin", requiresAuth, addPhasesAdmin);
router.put("/admin", requiresAuth, updatePhasesAdmin);
router.put("/admin/maininfo", requiresAuth, updatePhasesMaininfo);
router.delete("/admin/:id", requiresAuth, deletePhasesAdmin);
router.get("/get", requiresAuth, getAllPhases);

module.exports = router;