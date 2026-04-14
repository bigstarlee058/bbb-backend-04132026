const express = require("express");
const router = express.Router();
const {requiresAuth,requiresAdmin} = require('../middleware/authMiddleware.js');

const {
  getSettingAdmin,
  updateMonthCoverAdmin,
  getAllLanguages,
  getAvilableLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
} = require("../controllers/settingController.js");

router.get("/admin/get", getSettingAdmin);
router.post("/admin", requiresAuth, updateMonthCoverAdmin);
router.get("/", getSettingAdmin);
router.get("/admin/languages",requiresAuth,requiresAdmin, getAllLanguages);
router.get("/languages", getAvilableLanguages);
router.post("/languages", requiresAuth,requiresAdmin, createLanguage);
router.put("/languages/:langId", requiresAuth,requiresAdmin, updateLanguage);
router.delete("/languages/:langId", requiresAuth,requiresAdmin, deleteLanguage);

module.exports = router;