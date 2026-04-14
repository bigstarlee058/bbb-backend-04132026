const asyncHandler = require("express-async-handler");
const Tutorial = require("../models/tutorialModel");
const mongoose = require('mongoose');

const { getVimeoDetails, getSortInfo } = require("../utils/utils");
const { parseJSONFields, cleanupImageFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getTutorialsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const matchStage = search
      ? { $match: { title: { $regex: search, $options: "i" } } }
      : null;

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : null;

    const skipStage = { $skip: (page - 1) * perPage };
    const limitStage = { $limit: perPage };

    const facet = {
      $facet: {
        populatedTutorials: [
          ...(sortStage ? [sortStage] : []),
          skipStage,
          limitStage,
        ],
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push(facet);

    const results = await Tutorial.aggregate(pipeline).exec();

    const tutorials = results[0]?.populatedTutorials || [];
    const count = results[0]?.totalCount[0]?.totalMatchingDocuments || 0;

    res.status(200).json({ count, tutorials });
  } catch (error) {
    console.log(error);
    res.status(500).json({ count: 0, tutorials: [] });
  }
});

// Admin: Get all tutorials without pagination
const getAllTutorials = asyncHandler(async (_req, res) => {
  try {
    const tutorials = await Tutorial.find();
    res.status(200).json(tutorials);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getTutorialAdmin = asyncHandler(async (req, res) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id).lean();
    if (!tutorial)
      return res
        .status(404)
        .json({ result: false, message: "Tutorial not found" });

    try {
      const vimeoDetails = await getVimeoDetails(tutorial.vimeoId);
      res.status(200).json({ ...tutorial, files: vimeoDetails.files || [] });
    } catch {
      res.status(200).json(tutorial);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const addTutorialAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    
    parseJSONFields(data);

    const newId = new mongoose.Types.ObjectId();

    const imageResults = await processImageFields({
      req,
      collection: 'tutorials',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['image']
    });

    const mappedImageResults = {
      thumbnail: imageResults.image || '',
      thumbnailTranslations: imageResults.imageTranslations || {}
    };

    const tutorialData = {
      _id: newId,
      vimeoId: data.vimeoId,
      title: data.title,
      description: data.description,
      category: data.category,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoIdTranslations: data.vimeoIdTranslations || {},
      ...mappedImageResults
    };

    const tutorial = await Tutorial.create(tutorialData);

    res.status(200).json({data:{ result: true, tutorials: tutorial }});
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateTutorialAdmin = asyncHandler(async (req, res) => {
  try {
    const { tutorialId } = req.body;
    const data = { ...req.body };

    const existingTutorial = await Tutorial.findById(tutorialId).lean();
    
    if (!existingTutorial) {
      return res.status(404).json({ result: false, message: "Tutorial not found" });
    }

    const tempExistingDoc = {
      ...existingTutorial,
      image: existingTutorial.thumbnail,
      imageTranslations: existingTutorial.thumbnailTranslations
    };

    const imageResults = await processImageFields({
      req,
      collection: 'tutorials',
      documentId: tutorialId,
      existingDoc: tempExistingDoc,
      imageFields: ['image']
    });

    parseJSONFields(data);

    const mappedImageResults = {};
    if (imageResults.image !== undefined) {
      mappedImageResults.thumbnail = imageResults.image;
    }
    if (imageResults.imageTranslations !== undefined) {
      mappedImageResults.thumbnailTranslations = imageResults.imageTranslations;
    }

    const updateData = {
      vimeoId: data.vimeoId,
      title: data.title,
      description: data.description,
      category: data.category,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoIdTranslations: data.vimeoIdTranslations || {},
      ...mappedImageResults
    };

    cleanupImageFields(updateData);

    const updatedTutorial = await Tutorial.findByIdAndUpdate(
      tutorialId,
      updateData,
      { new: true }
    );
    res.status(200).json({data:{ result: true, tutorials: updatedTutorial }});
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const deleteTutorialAdmin = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const tutorial = await Tutorial.findById(id).lean();
    
    if (!tutorial) {
      return res.status(404).json({ result: false, message: "Tutorial not found" });
    }

    const context = {
      collection: 'tutorials',
      documentId: id
    };

    if (tutorial.thumbnail) {
      await deleteImageWithRegistry(tutorial.thumbnail, {
        ...context,
        fieldPath: 'image'
      });
    }

    if (tutorial.thumbnailTranslations) {
      const translations = tutorial.thumbnailTranslations instanceof Map 
        ? Object.fromEntries(tutorial.thumbnailTranslations)
        : tutorial.thumbnailTranslations;

      for (const [lang, imageUrl] of Object.entries(translations)) {
        if (imageUrl && typeof imageUrl === 'string') {
          await deleteImageWithRegistry(imageUrl, {
            ...context,
            fieldPath: `imageTranslations.${lang}`
          });
        }
      }
    }

    await Tutorial.findByIdAndDelete(id);

    res.status(200).json({ result: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getTutorials = asyncHandler(async (_req, res) => {
  try {
    const tutorial = await Tutorial.findOne().lean();
    if (!tutorial)
      return res
        .status(404)
        .json({ result: false, message: "No tutorials found" });

    try {
      const vimeoDetails = await getVimeoDetails(tutorial.vimeoId);
      res.status(200).json({ ...tutorial, files: vimeoDetails.files || [] });
    } catch {
      res.status(200).json(tutorial);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateTutorials = asyncHandler(async (req, res) => {
  try {
    const { vimeoId, title, description } = req.body;
    const updateData = { vimeoId, title, description };

    if (req.files?.[0]?.buffer) {
      updateData.imgUrl = await uploadImage(req.files[0].buffer);
    }

    await Tutorial.findOneAndUpdate({}, updateData, {
      upsert: true,
      new: true,
    }).lean();
    res.status(200).json({ result: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getTutorialsAdmin,
  getAllTutorials,
  getTutorialAdmin,
  addTutorialAdmin,
  updateTutorialAdmin,
  deleteTutorialAdmin,
  getTutorials,
  updateTutorials,
};
