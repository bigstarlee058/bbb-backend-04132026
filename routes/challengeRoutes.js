const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
  getChallengesAdmin,
  getChallenges,
  addChallengeAdmin,
  updateChallengeAdmin,
  deleteChallengeAdmin,
  getChallengeAdmin,
  getChallengeTitlesAdmin,
  joinChallenge,
  getFeaturedChallenge,
  toggleChallengeVisibility
} = require("../controllers/challengeController.js");

router.get("/get", requiresAuth, getChallenges);
router.get("/get-featured", requiresAuth, getFeaturedChallenge);
router.put("/", requiresAuth, joinChallenge);
router.put("/admin/toggle-visible", requiresAuth, toggleChallengeVisibility);

router.get("/admin/get", requiresAuth, getChallengesAdmin);
router.get("/admin/get/:id", requiresAuth, getChallengeAdmin);
router.post("/admin", requiresAuth, addChallengeAdmin);
router.put("/admin", requiresAuth, updateChallengeAdmin);
router.delete("/admin/:id", requiresAuth, deleteChallengeAdmin);
router.get("/admin/titlefilter", getChallengeTitlesAdmin);

module.exports = router;
