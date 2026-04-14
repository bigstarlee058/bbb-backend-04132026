const asyncHandler = require("express-async-handler");
const { getSortInfo } = require("../utils/utils");

const Warmup = require("../models/warmupModel");
const { getVimeoDetails } = require("../utils/utils");
const { parseJSONFields, } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const mongoose = require('mongoose');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getWarmupsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const pipeline = [];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const pipelineWarmups = [];

    if (sortBy) {
      const order = getSortInfo(sortBy);
      pipelineWarmups.push({ $sort: order });
    }

    if (perPage && page) {
      const skip = (page - 1) * perPage;
      pipelineWarmups.push({ $skip: skip }, { $limit: perPage });
    }

    pipeline.push({
      $facet: {
        populatedWarmups: pipelineWarmups,
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    });

    const [results] = await Warmup.aggregate(pipeline).exec();

    const warmups = results?.populatedWarmups || [];
    const count = results?.totalCount?.[0]?.totalMatchingDocuments || 0;

    return res.status(200).json({ count, warmups });
  } catch (error) {
    return res
      .status(500)
      .json({ count: 0, warmups: [], error: error.message });
  }
});

const getWarmupAdmin = asyncHandler(async (req, res) => {
  try {
    const warmup = await Warmup.findOne({ _id: req.params.id }).lean();
    if (!warmup) return res.status(200).json({});

    try {
      const vimeoDetails = await getVimeoDetails(warmup.vimeoId);
      return res
        .status(200)
        .json({ ...warmup, files: vimeoDetails.files || [] });
    } catch {
      return res.status(200).json({ ...warmup, files: [] });
    }
  } catch (error) {
    return res.status(500).json({ files: [], error: error.message });
  }
});

const getWarmupTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredWarmups = await Warmup.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1 }
    );

    return res.status(200).json(filteredWarmups);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const addWarmupAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);
    const newId = new mongoose.Types.ObjectId();
    const imageResults = await processImageFields({
      req,
      collection: 'warmups',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail', 'videoThumbnail']
    });
    const equipments = JSON.parse(req.body.equipments || "[]");
    const documentToInsert = {
      _id: newId,
      title: data.title,
      description: data.description,
      vimeoId: data.vimeoId,
      vimeoIdTranslations: data.vimeoIdTranslations || {},
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail || '',
      videoThumbnail: imageResults.videoThumbnail || '',
      equipments,
      length:data.length||"",
    };
    const warmup = await Warmup.create(documentToInsert);
    return res.status(200).json({ result: !!warmup });
  } catch (error) {
    return res.status(500).json({ result: false, error: error.message });
  }
});

const updateWarmupAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);
    
    const existingWarmup = await Warmup.findById(data._id).lean();
    if (!existingWarmup) {
      return res.status(404).json({ result: false, error: 'Warmup not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'warmups',
      documentId: data._id,
      existingDoc: existingWarmup,
      imageFields: ['thumbnail', 'videoThumbnail']
    });

    const equipments = JSON.parse(req.body.equipments || "[]");

    const updateData = {
      title: data.title,
      description: data.description,
      vimeoId: data.vimeoId,
      vimeoIdTranslations: data.vimeoIdTranslations || {},
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail || existingWarmup.thumbnail || '',
      videoThumbnail: imageResults.videoThumbnail || existingWarmup.videoThumbnail || '',
      equipments,
      length: data.length || ""
    };

    const result = await Warmup.findOneAndUpdate(
      { _id: data._id }, 
      updateData, 
      { new: true }
    ).lean();

    return res.status(200).json({ result: !!result });
  } catch (error) {
    return res.status(500).json({ result: false, error: error.message });
  }
});

const deleteWarmupAdmin = asyncHandler(async (req, res) => {
  
    const warmup = await Warmup.findById(req.params.id);
    if (!warmup) {
      return res.status(404).json({ result: false, message: "Warmup not found" });
    }

    const context = {
      collection: 'warmups',
      documentId: req.params.id
    };

    if (warmup.thumbnail) {
      await deleteImageWithRegistry(warmup.thumbnail, {
        ...context,
        fieldPath: 'thumbnail'
      });
    }

    if (warmup.videoThumbnail) {
      await deleteImageWithRegistry(warmup.videoThumbnail, {
        ...context,
        fieldPath: 'videoThumbnail'
      });
    }

    await Warmup.findByIdAndDelete(req.params.id);
    try {
    return res.status(200).json({ result: true, message: "Warmup deleted successfully" });
  } catch (error) {
    return res.status(500).json({ result: false, error: error.message });
  }
});

module.exports = {
  addWarmupAdmin,
  updateWarmupAdmin,
  deleteWarmupAdmin,
  getWarmupsAdmin,
  getWarmupAdmin,
  getWarmupTitlesAdmin,
};
