const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
  getSectionsAdmin,
  getSections,
  addSectionAdmin,
  updateSectionAdmin,
  deleteSectionAdmin,
  getSectionAdmin,
  getSectionTitlesAdmin,
} = require("../controllers/programInfoController.js");

router.get("/", requiresAuth, getSections);
router.get("/admin/get", getSectionsAdmin);
router.get("/admin/get/:id", requiresAuth, getSectionAdmin);
router.post("/admin", requiresAuth, addSectionAdmin);
router.put("/admin", requiresAuth, updateSectionAdmin);
router.delete("/admin/:id", requiresAuth, deleteSectionAdmin);
router.get("/admin/titlefilter", getSectionTitlesAdmin);



module.exports = router;
