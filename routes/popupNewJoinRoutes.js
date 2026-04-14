const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
 getPopupNewJoin,
  updatePopupNewJoin,
} = require("../controllers/popupNewJoinController.js");

router.get("/", requiresAuth, getPopupNewJoin);
router.put("/", requiresAuth, updatePopupNewJoin);
module.exports = router;
