const express = require("express");
const router = express.Router();
const { requiresAuth, requiresAdmin } = require("../middleware/authMiddleware.js");
const {
  createUpsell,
  getAllUpsells,
  getUpsellById,
  getActiveUpsells,
  updateUpsell,
  deleteUpsell,
  countUsersByCriteria,
  getUpsellsForUser,
  dismissUpsell,
  getDismissCount
} = require("../controllers/upsellController");

router.get("/upsells/active",requiresAuth, getActiveUpsells);
router.post("/upsells/count-users", requiresAuth, countUsersByCriteria);
router.route("/upsells")
  .get(getAllUpsells)
  .post(createUpsell);
router.get("/upsells/me",requiresAuth, getUpsellsForUser);
router.route("/upsells/:id",requiresAuth,requiresAdmin)
  .get(getUpsellById)
  .put(updateUpsell)
  .delete(deleteUpsell);
router.post("/upsells/:id/dismiss", requiresAuth, dismissUpsell);
router.get("/upsells/:id/dismiss-count", requiresAuth, getDismissCount);


module.exports = router;