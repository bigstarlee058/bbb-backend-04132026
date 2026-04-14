const express = require("express");
const router = express.Router();

const { handleWebhook } = require("../controllers/revenuecatController.js");

router.post("/webhook", handleWebhook);

module.exports = router;