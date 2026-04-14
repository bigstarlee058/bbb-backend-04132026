const express = require("express");
const router = express.Router();
const {requiresAuth} = require('../middleware/authMiddleware.js');

const {
    getFaqsAdmin,
    getFaqAdmin,
    getAllFaqs,
    addFaqAdmin,
    updateFaqAdmin,
    deleteFaqAdmin,
} = require("../controllers/faqsController.js");

router.get("/admin/get", getFaqsAdmin);
router.get("/admin/get/:id", requiresAuth, getFaqAdmin);
router.post("/admin", requiresAuth, addFaqAdmin);
router.put("/admin", requiresAuth, updateFaqAdmin);
router.delete("/admin/:id", requiresAuth, deleteFaqAdmin);
router.get("/", requiresAuth, getAllFaqs);

module.exports = router;
