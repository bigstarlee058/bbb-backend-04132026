const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  addAchievementsIndividualAdmin,
  updateAchievementsIndividualAdmin,
  deleteAchievementsIndividualAdmin,
  getAchievementsIndividualsAdmin,
  getAllAchievementsIndividuals,
  getAchievementsIndividualAdmin,
  getAchievementsIndividualTitlesAdmin,
} = require("../controllers/achievementsindividualController.js");

router.get("/admin/get", requiresAuth, getAchievementsIndividualsAdmin);
router.get("/get", requiresAuth, getAllAchievementsIndividuals);
router.get("/admin/get/:id", requiresAuth, getAchievementsIndividualAdmin);
router.get("/get/:id", requiresAuth, getAchievementsIndividualAdmin);
router.post("/admin", requiresAuth, addAchievementsIndividualAdmin);
router.put("/admin", requiresAuth, updateAchievementsIndividualAdmin);
router.delete("/admin/:id", requiresAuth, deleteAchievementsIndividualAdmin);
router.get("/admin/titlefilter", getAchievementsIndividualTitlesAdmin);

module.exports = router;
