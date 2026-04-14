const express = require("express");
const router = express.Router();
const { requiresAuth } = require("../middleware/authMiddleware.js");

const {
    getCountryList,
    getStatesList,
    getCitiesList
} = require("../controllers/LocationController.js");

router.get("/country", getCountryList);
router.get("/states/:country", getStatesList);
router.get("/cities/:country/:state", getCitiesList);

module.exports = router;