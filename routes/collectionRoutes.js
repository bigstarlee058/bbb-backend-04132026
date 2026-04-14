const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  addCollectionAdmin,
  updateCollectionAdmin,
  deleteCollectionAdmin,
  getCollectionsAdmin,
  getCollectionsApp,
  getFeaturedCollections,
  getCollectionAdmin,
  getCollectionTitlesAdmin,
} = require("../controllers/collectionController");

router.get("/admin/get", requiresAuth, getCollectionsAdmin);
router.get("/get", requiresAuth, getCollectionsApp);
router.get("/get-featured", requiresAuth, getFeaturedCollections);
router.get("/admin/get/:id", requiresAuth, getCollectionAdmin);
router.get("/get/:id", requiresAuth, getCollectionAdmin);
router.post("/admin", requiresAuth, addCollectionAdmin);
router.put("/admin", requiresAuth, updateCollectionAdmin);
router.delete("/admin/:id", requiresAuth, deleteCollectionAdmin);
router.get("/admin/titlefilter", getCollectionTitlesAdmin);

module.exports = router;