const asyncHandler = require("express-async-handler");
const AchievementsIndividual = require("../models/achievementsindividualModel");
const { getSortInfo } = require("../utils/utils");
const mongoose = require("mongoose");
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');

const getAchievementsIndividualsAdmin = asyncHandler(async (req, res) => {
  let { page = 1, perPage = 10, search, sortBy="NewestAdded" } = req.query;
  page = Math.max(1, parseInt(page));
  perPage = Math.max(1, parseInt(perPage));

  try {
    const matchStage = search
      ? {
          $match: {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          },
        }
      : null;

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);

    pipeline.push({
      $facet: {
        data: [
          { $sort: getSortInfo(sortBy) },
          { $skip: (page - 1) * perPage },
          { $limit: perPage },
        ],
        total: [{ $count: "count" }],
      },
    });

    const [result] = await AchievementsIndividual.aggregate(pipeline);
    res.status(200).json({
      count: result?.total?.[0]?.count || 0,
      achievementsIndividuals: result?.data || [],
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res
      .status(200)
      .json({ count: 0, achievementsIndividuals: [], message: error.message });
  }
});

const getAllAchievementsIndividuals = asyncHandler(async (req, res) => {
  const achievementsIndividuals = await AchievementsIndividual.find()
    .populate("target")
    .lean();
  if (!achievementsIndividuals) {
    return res.status(404).json({ error: "Achievement not found" });
  }
  res.status(200).json(achievementsIndividuals);
});

const getAchievementsIndividualAdmin = asyncHandler(async (req, res) => {
  const achievementsIndividual = await AchievementsIndividual.findById(
    req.params.id
  ).lean();
  if (!achievementsIndividual) {
    return res.status(404).json({ error: "Achievement not found" });
  }
  res.status(200).json(achievementsIndividual);
});

const getAchievementsIndividualTitlesAdmin = asyncHandler(async (req, res) => {
  const filterString = req.query.filterString || "";
  const filteredAchievementsIndividuals = await AchievementsIndividual.find(
    { title: { $regex: filterString, $options: "i" } },
    { title: 1 }
  ).lean();
  res.status(200).json(filteredAchievementsIndividuals);
});

const addAchievementsIndividualAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    if (!data.title || !data.title.trim()) {
      return res.status(400).json({ result: false, message: "Title is required" });
    }

    const newId = new mongoose.Types.ObjectId();

    const imageResults = await processImageFields({
      req,
      collection: 'achievementsindividuals',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['image']
    });

    const documentToInsert = {
      _id: newId,
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      targettype: data.targettype || '',
      target: data.target || null,
      value: data.value || 0,
      description: data.description || '',
      descriptionTranslations: data.descriptionTranslations || {},
      image: imageResults.image || ''
    };

    const achievementsIndividual = await AchievementsIndividual.create(documentToInsert);

    if (!achievementsIndividual) {
      return res.status(500).json({ result: false, message: "Failed to create achievement" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error adding achievement:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateAchievementsIndividualAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;

    if (!_id) {
      return res.status(400).json({ result: false, message: "ID is required" });
    }

    const existingDoc = await AchievementsIndividual.findById(_id).lean();

    if (!existingDoc) {
      return res.status(404).json({ result: false, message: "Achievement not found" });
    }

    parseJSONFields(data);

    if (!data.title || !data.title.trim()) {
      return res.status(400).json({ result: false, message: "Title is required" });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'achievementsindividuals',
      documentId: _id,
      existingDoc: existingDoc,
      imageFields: ['image']
    });

    const updateData = {
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      targettype: data.targettype || '',
      target: data.target || null,
      value: data.value || 0,
      description: data.description || '',
      descriptionTranslations: data.descriptionTranslations || {},
      image: imageResults.image || existingDoc.image || ''
    };

    const updated = await AchievementsIndividual.findByIdAndUpdate(_id, updateData, { new: true });

    if (!updated) {
      return res.status(404).json({ result: false, message: "Achievement not found" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error updating achievement:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteAchievementsIndividualAdmin = asyncHandler(async (req, res) => {
  try {
    const doc = await AchievementsIndividual.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ result: false, message: "Achievement not found" });
    }
    const context = {
      collection: 'achievementsindividuals',
      documentId: req.params.id
    };

    if (doc.image) {
      await deleteImageWithRegistry(doc.image, {
        ...context,
        fieldPath: 'image'
      });
    }

    await AchievementsIndividual.findByIdAndDelete(req.params.id);
    res.status(200).json({ result: true, message: "Achievement deleted successfully" });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addAchievementsIndividualAdmin,
  updateAchievementsIndividualAdmin,
  deleteAchievementsIndividualAdmin,
  getAchievementsIndividualAdmin,
  getAchievementsIndividualsAdmin,
  getAllAchievementsIndividuals,
  getAchievementsIndividualTitlesAdmin,
};
