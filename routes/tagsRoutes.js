const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
  getTagsAdmin,
  addTagAdmin,
  updateTagAdmin,
  deleteTagAdmin,
  getTagAdmin,
  getTagTitlesAdmin,
} = require("../controllers/tagsController.js");

router.get("/admin/get", getTagsAdmin);
router.get("/admin/get/:id", requiresAuth, getTagAdmin);
router.post("/admin", requiresAuth, addTagAdmin);
router.put("/admin", requiresAuth, updateTagAdmin);
router.delete("/admin/:id", requiresAuth, deleteTagAdmin);
router.get("/admin/titlefilter", getTagTitlesAdmin);

module.exports = router;
