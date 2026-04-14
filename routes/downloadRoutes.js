const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getDownloadsAdmin,
  getDownloads,
  getDownloadAdmin,
  getDownload,
  addDownloadAdmin,
  updateDownloadAdmin,
  deleteDownloadAdmin,
  getUpcomingDownloads,
} = require("../controllers/downloadController");

router.get("/admin/get", requiresAuth, getDownloadsAdmin);
router.get("/admin/get/:id", requiresAuth, getDownloadAdmin);
router.post("/admin", requiresAuth, addDownloadAdmin);
router.put("/admin", requiresAuth, updateDownloadAdmin);
router.delete("/admin/:id", requiresAuth, deleteDownloadAdmin);

router.get("/get", requiresAuth, getDownloads);
router.get("/get/:id", requiresAuth, getDownload);
router.get("/get-upcoming", requiresAuth, getUpcomingDownloads);

module.exports = router;