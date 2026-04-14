const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getTutorialsAdmin,
  getAllTutorials,
  getTutorialAdmin,
  addTutorialAdmin,
  updateTutorialAdmin,
  deleteTutorialAdmin,
  getTutorials,
  updateTutorials,
} = require("../controllers/tutorialController.js");

router.get("/admin/get", getTutorialsAdmin);
router.get("/get", getAllTutorials);
router.get("/admin/get/:id", requiresAuth, getTutorialAdmin);
router.post("/admin", requiresAuth, addTutorialAdmin);
router.put("/admin", requiresAuth, updateTutorialAdmin);
router.delete("/admin/:id", requiresAuth, deleteTutorialAdmin);
router.get("/get/:id", getTutorialAdmin);

router.get("/", requiresAuth, getTutorials);
router.put("/", requiresAuth, updateTutorials);
router.get("/get_screens", getTutorials);

module.exports = router;
