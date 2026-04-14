const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
  getPumpDaysAdmin,
  savePumpDays,
  getPumpDayAdmin,
  getPumpDayTitlesAdmin,
} = require("../controllers/pumpDayController.js");

router.put("/admin/update", requiresAuth, savePumpDays);
router.get("/admin/titlefilter", getPumpDayTitlesAdmin);


router.get("/", requiresAuth, getPumpDaysAdmin);
router.get("/get/:id", requiresAuth, getPumpDayAdmin);

module.exports = router;
