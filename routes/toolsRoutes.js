const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
  getAllTools,
  getToolById,
  addNewTool,
  deleteTool,
  updateTool,
  updateVisibility,
} = require("../controllers/toolsController.js");

router.get("/",getAllTools);
router.post("/",addNewTool);
router.get("/:id",requiresAuth, getToolById);
router.delete("/:id", requiresAuth, deleteTool);
router.put("/:id", requiresAuth, updateTool);
router.patch("/:id/visibility", requiresAuth, updateVisibility);
  
module.exports = router;
