const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
  getPopupEquipment,
  updatePopupEquipment,
} = require("../controllers/popupequipmentController.js");

router.get("/", requiresAuth, getPopupEquipment);
router.put("/", requiresAuth, updatePopupEquipment);

router.get("/get_popupequipment", getPopupEquipment);

module.exports = router;
