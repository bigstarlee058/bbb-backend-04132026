const asyncHandler = require("express-async-handler");
const Category = require("../models/categoryModel");
const Exercise = require("../models/exerciseModel");
const { getSortInfo } = require("../utils/utils");
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const mongoose = require('mongoose');
const getCategoriesAdmin = asyncHandler(async (req, res) => {
  let { page = 1, perPage = 10, search, sortBy } = req.query;
  page = Math.max(1, parseInt(page));
  perPage = Math.max(1, parseInt(perPage));

  try {
    const matchStage = search
      ? { $match: { title: { $regex: search, $options: "i" } } }
      : null;

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : null;
    const skipStage = { $skip: (page - 1) * perPage };
    const limitStage = { $limit: perPage };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push({
      $facet: {
        populatedCategories: [
          ...(sortStage ? [sortStage] : []),
          skipStage,
          limitStage,
        ],
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    });

    const results = await Category.aggregate(pipeline);
    const { populatedCategories = [], totalCount = [] } = results[0] || {};
    const count = totalCount.length ? totalCount[0].totalMatchingDocuments : 0;

    const categoriesWithCounts = await Promise.all(
      populatedCategories.map(async (cat) => {
        const exerciseCount = await Exercise.countDocuments({
          categories: cat._id.toString(),
        });
        return { ...cat, exerciseCount };
      })
    );

    res.status(200).json({ count, categories: categoriesWithCounts });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(200).json({ count: 0, categories: [] });
  }
});

const getCategoryAdmin = asyncHandler(async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: error.message });
  }
});

const getCategoryTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const categories = await Category.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    );

    res.status(200).json(categories || []);
  } catch (error) {
    console.error("Error fetching category titles:", error);
    res.status(200).json([]);
  }
});

const addCategoryAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const newId = new mongoose.Types.ObjectId();

    const imageResults = await processImageFields({
      req,
      collection: 'categories',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail']
    });
    const categoryData = {
      _id: newId,
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      thumbnail: imageResults.thumbnail || '',
    };

    const category = await Category.create(categoryData);

    res.status(200).json({
      data: {
        result: true,
        category: category
      }
    });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const updateCategoryAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    
    parseJSONFields(data);

    
    const existingCategory = await Category.findById(_id).lean();
    if (!existingCategory) {
      return res.status(404).json({ result: false, message: 'Category not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'categories',
      documentId: _id,
      existingDoc: existingCategory,
      imageFields: ['thumbnail']
    });

    const categoryData = {
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingCategory.thumbnail,
    };

    const category = await Category.findByIdAndUpdate(_id, categoryData, { new: true });

    res.status(200).json({ result: true, category: category });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const deleteCategoryAdmin = asyncHandler(async (req, res) => {
  try {
    const result = await Category.findByIdAndDelete(req.params.id).lean();
    res.status(200).json({ result: !!result });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(200).json({ result: false });
  }
});

module.exports = {
  getCategoriesAdmin,
  addCategoryAdmin,
  updateCategoryAdmin,
  deleteCategoryAdmin,
  getCategoryAdmin,
  getCategoryTitlesAdmin,
};
