const asyncHandler = require("express-async-handler");
const Faqs = require("../models/faqsModel");
const { getSortInfo } = require("../utils/utils");
const { parseJSONFields } = require('../utils/requestHelpers');
const getFaqsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy="NewestAdded" } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const matchStage = search
      ? { question: { $regex: search, $options: "i" } }
      : {};

    const totalCountPromise = Faqs.countDocuments(matchStage);

    let query = Faqs.find(matchStage).lean();
    if (sortBy) {
      const order = getSortInfo(sortBy);
      query = query.sort(order);
    }
    if (perPage && page) {
      query = query.skip((page - 1) * perPage).limit(perPage);
    }

    const [faqs, count] = await Promise.all([query, totalCountPromise]);
    res.status(200).json({ count, faqs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const getAllFaqs = asyncHandler(async (req, res) => {
  try {
    const faqs = await Faqs.find().lean();
    res.status(200).json(faqs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getFaqAdmin = asyncHandler(async (req, res) => {
  try {
    const faq = await Faqs.findById(req.params.id).lean();
    if (!faq)
      return res.status(404).json({ result: false, message: "FAQ not found" });
    res.status(200).json(faq);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const addFaqAdmin = asyncHandler(async (req, res) => {
  try {
    const { ...data } = req.body;
    parseJSONFields(data);
    const faqData = {
      question:data.question,
      questionTranslations:data.questionTranslations,
      answer:data.answer,
      answerTranslations:data.answerTranslations
    };
    const faq = await Faqs.create(faqData);
    if (!faq)
      return res
        .status(500)
        .json({ result: false, message: "Failed to create FAQ" });
    res.status(200).json({ result: true, faq });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateFaqAdmin = asyncHandler(async (req, res) => {
  
    const data = { ...req.body };
    const { _id }= data
    parseJSONFields(data);
    const faqData = {
      question:data.question,
      questionTranslations:data.questionTranslations,
      answer:data.answer,
      answerTranslations:data.answerTranslations
    };
    try {
    const faq = await Faqs.findByIdAndUpdate(
      _id,
      faqData,
      { new: true }
    ).lean();
    if (!faq)
      return res.status(404).json({ result: false, message: "FAQ not found" });
    res.status(200).json({ result: true, faq });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteFaqAdmin = asyncHandler(async (req, res) => {
  try {
    const faq = await Faqs.findByIdAndDelete(req.params.id).lean();
    if (!faq)
      return res.status(404).json({ result: false, message: "FAQ not found" });
    res.status(200).json({ result: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getFaqsAdmin,
  getFaqAdmin,
  getAllFaqs,
  addFaqAdmin,
  updateFaqAdmin,
  deleteFaqAdmin,
};
