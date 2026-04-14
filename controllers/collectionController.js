const asyncHandler = require("express-async-handler");
const { uploadImage } = require("../utils/files/google/gcs");
const Collection = require("../models/collectionModel");
const Equipment = require("../models/equipmentModel");
const { getSortInfo } = require("../utils/utils");
const mongoose = require('mongoose');
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getCollectionsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy="NewestAdded" } = req.query;
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

    const sortStage = sortBy ? [{ $sort: getSortInfo(sortBy) }] : [];
    const paginationStage =
      perPage && page
        ? [{ $skip: (page - 1) * perPage }, { $limit: perPage }]
        : [];

    pipeline.push({
      $facet: {
        populatedCollections: [...sortStage, ...paginationStage],
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    });

    const [results] = await Collection.aggregate(pipeline).exec();
    const collections = results?.populatedCollections || [];
    const count = results?.totalCount?.[0]?.totalMatchingDocuments || 0;

    res.status(200).json({ count, collections });
  } catch {
    res.status(200).json({ count: 0, collections: [] });
  }
});

const getFeaturedCollections = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const pipeline = [{ $match: { isFeatured: true } }];

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

    const sortStage = sortBy ? [{ $sort: getSortInfo(sortBy) }] : [];
    const paginationStage =
      perPage && page
        ? [{ $skip: (page - 1) * perPage }, { $limit: perPage }]
        : [];

    pipeline.push({
      $facet: {
        populatedCollections: [...sortStage, ...paginationStage],
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    });

    const [results] = await Collection.aggregate(pipeline).exec();
    const collections = results?.populatedCollections || [];
    const count = results?.totalCount?.[0]?.totalMatchingDocuments || 0;

    res.status(200).json({ count, collections });
  } catch {
    res.status(200).json({ count: 0, collections: [] });
  }
});

const getCollectionsApp = asyncHandler(async (req, res) => {
  try {
    const [collections, count] = await Promise.all([
      Collection.find().lean(),
      Collection.countDocuments(),
    ]);
    res.status(200).json({ count, collections });
  } catch {
    res.status(200).json({ count: 0, collections: [] });
  }
});

const getCollectionAdmin = asyncHandler(async (req, res) => {
  try {
    const [collection, relatedEquipment] = await Promise.all([
      Collection.findOne({ _id: req.params.id }).lean(),
      Equipment.find({ collections: req.params.id })
        .populate("collections")
        .lean(),
    ]);
    if (!collection) {
      return res.status(200).json({});
    }
    res.status(200).json({ ...collection, relatedEquipment });
  } catch {
    res.status(200).json({});
  }
});

const getCollectionTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredCollections = await Collection.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    );
    res.status(200).json(filteredCollections);
  } catch {
    res.status(200).json([]);
  }
});

const addCollectionAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const isFeatured = data.isFeatured === true || data.isFeatured === "true";

    const newId = new mongoose.Types.ObjectId();
    const imageResults = await processImageFields({
      req,
      collection: 'collections',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail']
    });

    const collectionData = {
      _id: newId,
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      description: data.description,
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail || '',
      thumbnailTranslations: imageResults.thumbnailTranslations || {},
      isFeatured,
    };

    const collection = await Collection.create(collectionData);
    res.status(200).json({ result: !!collection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateCollectionAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    parseJSONFields(data);

    const isFeatured = data.isFeatured === true || data.isFeatured === "true";

    const existingCollection = await Collection.findById(_id).lean();
    if (!existingCollection) {
      return res.status(404).json({ result: false, message: 'Collection not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'collections',
      documentId: _id,
      existingDoc: existingCollection,
      imageFields: ['thumbnail']
    });

    const collectionData = {
      title: data.title,
      titleTranslations: data.titleTranslations || existingCollection.titleTranslations || {},
      description: data.description,
      descriptionTranslations: data.descriptionTranslations || existingCollection.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingCollection.thumbnail,
      thumbnailTranslations: imageResults.thumbnailTranslations || existingCollection.thumbnailTranslations || {},
      isFeatured,
    };

    const result = await Collection.findByIdAndUpdate(_id, collectionData, { new: true, lean: true });
    res.status(200).json({ result: !!result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteCollectionAdmin = asyncHandler(async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ result: false, message: "Collection not found" });
    }

    const context = {
      collection: 'collections',
      documentId: req.params.id
    };

    if (collection.thumbnail) {
      await deleteImageWithRegistry(collection.thumbnail, {
        ...context,
        fieldPath: 'thumbnail'
      });
    }

    if (collection.thumbnailTranslations) {
      const translations = collection.thumbnailTranslations instanceof Map
        ? Object.fromEntries(collection.thumbnailTranslations)
        : collection.thumbnailTranslations;

      for (const [lang, imageUrl] of Object.entries(translations)) {
        if (imageUrl && typeof imageUrl === 'string') {
          await deleteImageWithRegistry(imageUrl, {
            ...context,
            fieldPath: `thumbnailTranslations.${lang}`
          });
        }
      }
    }

    await Collection.findByIdAndDelete(req.params.id);
    res.status(200).json({ result: true, message: "Collection deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addCollectionAdmin,
  updateCollectionAdmin,
  deleteCollectionAdmin,
  getCollectionsAdmin,
  getCollectionsApp,
  getFeaturedCollections,
  getCollectionAdmin,
  getCollectionTitlesAdmin,
};
