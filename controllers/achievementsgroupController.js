const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const AchievementsGroup = require("../models/achievementsgroupModel");
const ExerciseStatus = require("../models/exercisestatusModel");
const DayStatus = require("../models/daystatusModel");
const Exercise = require("../models/exerciseModel");
const User = require("../models/userModel");
const { getSortInfo } = require("../utils/utils");
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getAchievementsGroupsAdmin = asyncHandler(async (req, res) => {
  let { page = 1, perPage = 10, search, sortBy } = req.query;
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

    const sortStage = sortBy
      ? { $sort: getSortInfo(sortBy) }
      : { $sort: { createdAt: -1 } };
    const skipStage = { $skip: (page - 1) * perPage };
    const limitStage = { $limit: perPage };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push({
      $facet: {
        data: [sortStage, skipStage, limitStage].filter(Boolean),
        total: [{ $count: "count" }],
      },
    });

    const [result] = await AchievementsGroup.aggregate(pipeline);

    res.status(200).json({
      count: result?.total?.[0]?.count || 0,
      achievementsGroups: result?.data || [],
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res
      .status(200)
      .json({ count: 0, achievementsGroups: [], message: error.message });
  }
});

const getAllAchievementsGroups = asyncHandler(async (req, res) => {
  try {
    const [
      userInfo,
      exerciseHistories,
      exercises,
      achievementsGroups,
      completedDaysData,
    ] = await Promise.all([
      User.findById(req.user._id),
      ExerciseStatus.find({ userId: req.user._id }).lean(),
      Exercise.find().select("id tags"),
      AchievementsGroup.find().populate({
        path: "achievements.achievementId",
        populate: { path: "target" },
      }),
      DayStatus.find({ userId: req.user._id, status: "Completed" }).select(
        "_id"
      ),
    ]);

    const completedDaysCount = completedDaysData.length;

    const completedHistories = exerciseHistories.filter(
      (h) => h.status === "Completed"
    );

    const tagToExerciseIds = {};
    for (const ex of exercises) {
      for (const tag of ex.tags.map(String)) {
        if (!tagToExerciseIds[tag]) tagToExerciseIds[tag] = [];
        tagToExerciseIds[tag].push(ex._id.toString());
      }
    }

    const enrichedGroups = achievementsGroups.map((group) => {
      let currentValue = 0;

      switch (group.type) {
        case "Days since joining":
          currentValue = Math.floor(
            (Date.now() - new Date(userInfo.createdAt)) / 86400000
          );
          break;

        case "Days Completed":
          currentValue = completedDaysCount;
          break;

        case "Total exercises finished": {
          const tagId = group.achievements[0]?.achievementId?.target?.id || "";
          const matchingExerciseIds = tagToExerciseIds[tagId] || [];
          currentValue = completedHistories.filter((h) =>
            matchingExerciseIds.includes(h.exerciseId)
          ).length;
          break;
        }

        case "Total Weight lifted": {
          const { title = "", id = "" } =
            group.achievements[0]?.achievementId?.target || {};
          const histories =
            title === "Pilot"
              ? completedHistories
              : completedHistories.filter((h) =>
                (tagToExerciseIds[id] || []).includes(h.exerciseId)
              );
          currentValue = histories.reduce(
            (sum, h) => sum + Number(h.totalWeight || 0),
            0
          );
          break;
        }
      }

      return {
        id: group._id,
        title: group.title,
        titleTranslations:group.titleTranslations,
        thumbnail: group.thumbnail,
        description: group.description,
        descriptionTranslations:group.descriptionTranslations,
        type: group.type,
        currentValue,
        achievements: group.achievements,
      };
    });

    res.status(200).json(enrichedGroups);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

const getAchievementsGroupAdmin = asyncHandler(async (req, res) => {
  try {
    const achievementsGroup = await AchievementsGroup.findOne({
      _id: req.params.id,
    }).lean();

    if (!achievementsGroup) {
      res.status(404).json({ message: "Not found" });
    }

    res.status(200).json(achievementsGroup);
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
});

const addAchievementsGroupAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    if (!data.title || !data.title.trim()) {
      return res.status(400).json({
        result: false,
        message: "Title is required",
      });
    }

    if (!data.type || !data.type.trim()) {
      return res.status(400).json({
        result: false,
        message: "Type is required",
      });
    }

    let achievements;
    try {
      achievements = Array.isArray(data.achievements)
        ? data.achievements
        : JSON.parse(data.achievements || "[]");
    } catch {
      return res.status(400).json({
        result: false,
        message: "Achievements must be a valid JSON array.",
      });
    }

    if (!Array.isArray(achievements) || !achievements.length) {
      return res.status(400).json({
        result: false,
        message: "At least one achievement is required",
      });
    }

    const isValid = achievements.every(
      (a) => a.achievementId && typeof a.index === "number"
    );
    if (!isValid) {
      return res.status(400).json({
        result: false,
        message: "Invalid achievement entry",
      });
    }

    const newId = new mongoose.Types.ObjectId();

    const imageResults = await processImageFields({
      req,
      collection: 'achievementsgroups',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail']
    });

    const documentToInsert = {
      _id: newId,
      title: data.title,
      type: data.type,
      description: data.description || '',
      achievements,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail || ''
    };

    const achievementsGroup = await AchievementsGroup.create(documentToInsert);

    if (!achievementsGroup) {
      return res.status(500).json({
        result: false,
        message: "Failed to create achievements group",
      });
    }

    return res.status(200).json({ result: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      result: false,
      message: "Server error",
    });
  }
});

const updateAchievementsGroupAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    if (!_id) {
      return res.status(400).json({ result: false, message: "ID is required" });
    }

    const existingGroup = await AchievementsGroup.findById(_id).lean();

    if (!existingGroup) {
      return res.status(404).json({ result: false, message: "Achievements group not found" });
    }

    parseJSONFields(data);

    if (!data.title || !data.title.trim()) {
      return res.status(400).json({
        result: false,
        message: "Title is required",
      });
    }

    if (!data.type || !data.type.trim()) {
      return res.status(400).json({
        result: false,
        message: "Type is required",
      });
    }
    let achievements = [];
    try {
      achievements = Array.isArray(data.achievements)
        ? data.achievements
        : JSON.parse(data.achievements || "[]");
    } catch {
      return res.status(400).json({
        result: false,
        message: "Achievements must be a valid JSON array.",
      });
    }

    if (!Array.isArray(achievements) || !achievements.length) {
      return res.status(400).json({
        result: false,
        message: "At least one achievement is required",
      });
    }

    const isValid = achievements.every(
      (a) => a.achievementId && typeof a.index === "number"
    );
    if (!isValid) {
      return res.status(400).json({
        result: false,
        message: "Invalid achievement entry",
      });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'achievementsgroups',
      documentId: _id,
      existingDoc: existingGroup,
      imageFields: ['thumbnail']
    });

    const updateData = {
      title: data.title,
      type: data.type,
      description: data.description || '',
      achievements,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail || existingGroup.thumbnail || ''
    };

    const updatedGroup = await AchievementsGroup.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteAchievementsGroupAdmin = asyncHandler(async (req, res) => {
  try {
    const group = await AchievementsGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ result: false, message: "Group not found" });
    }

    const context = {
      collection: 'achievementsgroups',
      documentId: req.params.id
    };

    if (group.thumbnail) {
      await deleteImageWithRegistry(group.thumbnail, {
        ...context,
        fieldPath: 'thumbnail'
      });
    }

    await AchievementsGroup.findByIdAndDelete(req.params.id);

    res.status(200).json({ result: true, message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
module.exports = {
  addAchievementsGroupAdmin,
  updateAchievementsGroupAdmin,
  deleteAchievementsGroupAdmin,
  getAchievementsGroupAdmin,
  getAchievementsGroupsAdmin,
  getAllAchievementsGroups,
};
