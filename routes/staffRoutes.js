const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
  getStaffsAdmin,
  getStaffs,
  addStaffAdmin,
  updateStaffAdmin,
  deleteStaffAdmin,
  getStaffAdmin,
  getStaffTitlesAdmin,
  addOwnSpotsligths
} = require("../controllers/staffController.js");

router.get("/admin/get", getStaffsAdmin);
router.get("/admin/get/:id", requiresAuth, getStaffAdmin);
router.post("/admin", requiresAuth, addStaffAdmin);
router.put("/admin", requiresAuth, updateStaffAdmin);
router.get("/get", getStaffs);
router.delete("/admin/:id", requiresAuth, deleteStaffAdmin);
router.get("/admin/titlefilter", getStaffTitlesAdmin);
router.post("/addOwnSpotsligt", requiresAuth, addOwnSpotsligths);

module.exports = router;
