const asyncHandler = require("express-async-handler");
const Exercise = require("../models/exerciseModel");
const Equipment = require("../models/equipmentModel");
const Category = require("../models/categoryModel");
const { getVimeoDetails, getSortInfo } = require("../utils/utils");
const { parseJSONFields, } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const mongoose = require('mongoose');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');

const getExercisesAdmin = asyncHandler(async (req, res) => {
  try {
    let {
      page = 1,
      perPage = 0,
      search,
      sortBy,
      filterCategoriesString = "",
      filterEquipmentString = "",
    } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const [filteredCategories, filteredEquipments] = await Promise.all([
      Category.find(
        { title: { $regex: filterCategoriesString, $options: "i" } },
        { title: 1 }
      ).lean(),
      Equipment.find(
        { title: { $regex: filterEquipmentString, $options: "i" } },
        { title: 1 }
      ).lean(),
    ]);

    const pipeline = [];

    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { vimeoId: { $regex: regex } },
          ],
        },
      });
    }

    const exercisesPipeline = [
      ...(sortBy ? [{ $sort: getSortInfo(sortBy) }] : []),
      ...(perPage > 0
        ? [{ $skip: (page - 1) * perPage }, { $limit: perPage }]
        : []),
    ];

    pipeline.push({
      $facet: {
        populatedExercises: exercisesPipeline,
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    });

    const [results] = await Exercise.aggregate(pipeline);
    const exercises = results?.populatedExercises || [];
    const totalCount = results?.totalCount?.[0]?.totalMatchingDocuments || 0;

    res
      .status(200)
      .json({
        exercises,
        categories: filteredCategories,
        equipments: filteredEquipments,
        totalCount,
      });
  } catch {
    res
      .status(200)
      .json({ exercises: [], categories: [], equipments: [], totalCount: 0 });
  }
});

const getExercisesUser = asyncHandler(async (req, res) => {
  try {
    let {
      page,
      perPage,
      search = "",
      sortBy = "A-Z",
    } = req.query;

    const [allCategories, allEquipments] = await Promise.all([
      Category.find({}, { _id: 1, title: 1, titleTranslations:1 })
        .lean()
        .then(cats =>
          cats.map(cat => ({
            _id: cat._id ? cat._id.toString() : "",
            title: cat.title || "",
            titleTranslations:cat.titleTranslations||{},
            id: cat._id ? cat._id.toString() : "",
          }))
        ),
      Equipment.find({}, { _id: 1, title: 1 })
        .lean()
        .then(equips =>
          equips.map(equip => ({
            _id: equip._id ? equip._id.toString() : "",
            title: equip.title || "",
            id: equip._id ? equip._id.toString() : "",
          }))
        ),
    ]);

    const matchConditions = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      matchConditions.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { vimeoId: { $regex: regex } },
      ];
    }

    const pipeline = [];
    pipeline.push({ $match: matchConditions });

    let sortStage = {};
    switch (sortBy) {
      case "A-Z":
        sortStage = { title: 1 };
        break;
      case "Z-A":
        sortStage = { title: -1 };
        break;
      case "Newest added":
        sortStage = { createdAt: -1 };
        break;
      case "Oldest added":
        sortStage = { createdAt: 1 };
        break;
      default:
        sortStage = { title: 1 };
    }
    pipeline.push({ $sort: sortStage });

    if (page && perPage) {
      page = parseInt(page);
      perPage = parseInt(perPage);
      pipeline.push({ $skip: (page - 1) * perPage });
      pipeline.push({ $limit: perPage });
    }
    
    const exercises = await Exercise.aggregate(pipeline);
    const safeArrayToString = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => item != null).map(item => {
        if (typeof item === 'string') return item;
        if (item._id) return item._id.toString();
        if (item.toString) return item.toString();
        return String(item);
      });
    };

    const convertMapToObject = (mapField) => {
      if (!mapField) return {};
      if (mapField instanceof Map) return Object.fromEntries(mapField);
      if (typeof mapField === 'object') return mapField;
      return {};
    };

    const formattedExercises = exercises.map(exercise => {
      return {
        _id: exercise._id ? exercise._id.toString() : "",
        title: exercise.title || "",
        titleTranslations: convertMapToObject(exercise.titleTranslations),
        vimeoId: exercise.vimeoId || "",
        vimeoIdTranslations: convertMapToObject(exercise.vimeoIdTranslations),
        thumbnail: exercise.thumbnail || "",
        thumbnailTranslations: convertMapToObject(exercise.thumbnailTranslations),
        videoThumbnail: exercise.videoThumbnail || exercise.thumbnail || "",
        videoThumbnailTranslations: convertMapToObject(exercise.videoThumbnailTranslations),
        description: exercise.description || "",
        descriptionTranslations: convertMapToObject(exercise.descriptionTranslations),
        guide: exercise.guide || "",
        categories: safeArrayToString(exercise.categories),
        usedEquipments: safeArrayToString(exercise.usedEquipments),
        relatedExercises: safeArrayToString(exercise.relatedExercises),
        files: Array.isArray(exercise.files) ? exercise.files : [],
        createdAt: exercise.createdAt ? exercise.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: exercise.updatedAt ? exercise.updatedAt.toISOString() : new Date().toISOString(),
        __v: exercise.__v !== undefined && exercise.__v !== null ? exercise.__v : 0,
      };
    });

    res.status(200).json({
      exercises: formattedExercises,
      categories: allCategories,
      equipments: allEquipments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      exercises: [],
      categories: [],
      equipments: [],
    });
  }
});

const getExerciseAdmin = asyncHandler(async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate("relatedExercises")
      .populate("usedEquipments")
      .lean();

    if (!exercise) return res.status(200).json({});

    try {
      const vimeoDetails = await getVimeoDetails(exercise.vimeoId);
      exercise.files = vimeoDetails.files || [];
    } catch {
      exercise.files = [];
    }

    res.status(200).json(exercise);
  } catch {
    res.status(200).json({});
  }
});

const getExerciseTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredExercises = await Exercise.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1 }
    );

    res.status(200).json(filteredExercises);
  } catch {
    res.status(200).json([]);
  }
});

const addExerciseAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    
    parseJSONFields(data);

    const parseArray = (field) => {
      if (!data[field]) return [];
      if (Array.isArray(data[field])) return data[field];
      try {
        return JSON.parse(data[field]);
      } catch {
        return [];
      }
    };

    const newId = new mongoose.Types.ObjectId();
    const imageResults = await processImageFields({
      req,
      collection: 'exercises',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail', 'videoThumbnail']
    });
    const exerciseData = {
      _id: newId,
      title: data.title,
      description: data.description,
      vimeoId: data.vimeoId,
      categories: parseArray('categories'),
      tags: parseArray('tags'),
      usedEquipments: parseArray('usedEquipments'),
      relatedExercises: parseArray('relatedExercises'),
      guide: data.guide || '',
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoIdTranslations: data.vimeoIdTranslations || {},
      thumbnail: imageResults.thumbnail || '',
      thumbnailTranslations: imageResults.thumbnailTranslations || {},
      videoThumbnail: imageResults.videoThumbnail || '',
      videoThumbnailTranslations: imageResults.videoThumbnailTranslations || {}
    };

    const exercise = await Exercise.create(exerciseData);

    res.status(200).json({result: true, exercise: exercise });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateExerciseAdmin = asyncHandler(async (req, res) => {
  try {
    
    const data = { ...req.body };
    const { _id } = data;
    parseJSONFields(data);

    // Parse array fields properly
    const parseArray = (field) => {
      if (!data[field]) return [];
      if (Array.isArray(data[field])) return data[field];
      try {
        return JSON.parse(data[field]);
      } catch {
        return [];
      }
    };

    // Get existing exercise
    const existingExercise = await Exercise.findById(_id).lean();
    if (!existingExercise) {
      return res.status(404).json({ result: false, message: 'Exercise not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'exercises',
      documentId: _id,
      existingDoc: existingExercise,
      imageFields: ['thumbnail', 'videoThumbnail']
    });

    const exerciseData = {
      title: data.title,
      description: data.description,
      vimeoId: data.vimeoId,
      categories: parseArray('categories'),
      tags: parseArray('tags'),
      usedEquipments: parseArray('usedEquipments'),
      relatedExercises: parseArray('relatedExercises'),
      guide: data.guide || '',
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoIdTranslations: data.vimeoIdTranslations || {},
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingExercise.thumbnail,
      thumbnailTranslations: imageResults.thumbnailTranslations || existingExercise.thumbnailTranslations || {},
      videoThumbnail: imageResults.videoThumbnail !== undefined ? imageResults.videoThumbnail : existingExercise.videoThumbnail,
      videoThumbnailTranslations: imageResults.videoThumbnailTranslations || existingExercise.videoThumbnailTranslations || {}
    };

    const exercise = await Exercise.findByIdAndUpdate(_id, exerciseData, { new: true });

    res.status(200).json({ result: true, exercise: exercise } );
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteExerciseAdmin = asyncHandler(async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }

    const context = {
      collection: 'exercises',
      documentId: req.params.id
    };
    if (exercise.thumbnail) {
      await deleteImageWithRegistry(exercise.thumbnail, {
        ...context,
        fieldPath: 'thumbnail'
      });
    }
    if (exercise.thumbnailTranslations) {
      const translations = exercise.thumbnailTranslations instanceof Map 
        ? Object.fromEntries(exercise.thumbnailTranslations) 
        : exercise.thumbnailTranslations;
      
      for (const [lang, imageUrl] of Object.entries(translations)) {
        if (imageUrl && typeof imageUrl === 'string') {
          await deleteImageWithRegistry(imageUrl, {
            ...context,
            fieldPath: `thumbnailTranslations.${lang}`
          });
        }
      }
    }
    if (exercise.videoThumbnail) {
      await deleteImageWithRegistry(exercise.videoThumbnail, {
        ...context,
        fieldPath: 'videoThumbnail'
      });
    }
    if (exercise.videoThumbnailTranslations) {
      const translations = exercise.videoThumbnailTranslations instanceof Map 
        ? Object.fromEntries(exercise.videoThumbnailTranslations) 
        : exercise.videoThumbnailTranslations;
      
      for (const [lang, imageUrl] of Object.entries(translations)) {
        if (imageUrl && typeof imageUrl === 'string') {
          await deleteImageWithRegistry(imageUrl, {
            ...context,
            fieldPath: `videoThumbnailTranslations.${lang}`
          });
        }
      }
    }

    await Exercise.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ result: true, message: "Exercise deleted successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});
module.exports = {
  addExerciseAdmin,
  updateExerciseAdmin,
  deleteExerciseAdmin,
  getExercisesUser,
  getExerciseAdmin,
  getExerciseTitlesAdmin,
  getExercisesAdmin
};
