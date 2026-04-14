const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ExerciseHistory = require("../models/exercisehistoryModel");
const Tags = require("../models/TagsModel");
const Exercise = require("../models/exerciseModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = async () => {
  await Setting.updateOne({}, { exercisehistoryCheckpoint: new Date() });
};

const addExerciseHistory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      split,
      dataId,
      exerciseId,
      extraId,
      monthId,
      weekId,
      dayId,
      date,
      status,
      sets,
      reps,
      weight,
      rest,
      load,
      effort,
      index,
      subIndex,
      totalSet,
      type,
    } = req.body;

    let exactDate;
    try {
      if (date && typeof date === 'string') {
        const dateWithZ = date.replace(' ', 'T') + 'Z';
        exactDate = new Date(dateWithZ);
        if (isNaN(exactDate.getTime())) {
          throw new Error('Invalid date');
        }
      } else {
        exactDate = date; 
      }
    } catch (dateError) {
      console.warn('Date parsing failed, using original:', dateError.message);
      exactDate = date;
    }

    const documentToInsert = {
      userId,
      split,
      dataId,
      exerciseId,
      extraId,
      monthId,
      weekId,
      dayId,
      date: exactDate,
      status,
      sets,
      reps,
      weight,
      rest,
      load,
      effort,
      index,
      subIndex,
      totalSet,
      type,
    };

    const exerciseHistory = await ExerciseHistory.create(documentToInsert);
    if (exerciseHistory) await updateCheckpoint();

    res.status(200).json({ result: !!exerciseHistory });
  } catch (error) {
    console.error('Error creating exercise history:', error);
    res.status(200).json({ result: false });
  }
});
const updateExerciseHistoryBulk = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { history } = req.body;

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ result: false, message: "Invalid or empty history array" });
  }

  try {
    const bulkOps = history.map((exercise) => {
      const {
        split,
        dataId,
        exerciseId,
        extraId,
        monthId,
        weekId,
        dayId,
        date,
        status,
        sets,
        reps,
        weight,
        rest,
        load,
        effort,
        index,
        subIndex,
        totalSet,
        type,
      } = exercise;

      const updateData = {
        split,
        exerciseId,
        extraId,
        monthId,
        weekId,
        dayId,
        date,
        status,
        sets,
        reps,
        weight,
        rest,
        load,
        effort,
        index,
        subIndex,
        totalSet,
        type,
        userId,
      };

      return {
        updateOne: {
          filter: { dataId, userId },
          update: { $set: updateData },
          upsert: true,
        },
      };
    });

    const [bulkResult] = await Promise.all([
      ExerciseHistory.bulkWrite(bulkOps, { ordered: false }),
      updateCheckpoint(),
    ]);

    res.status(200).json({
      result: true,
      matched: bulkResult.matchedCount,
      modified: bulkResult.modifiedCount,
      upserted: bulkResult.upsertedCount,
    });
  } catch (error) {
    console.error("Error bulk updating documents:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const updateExerciseHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    split,
    dataId,
    exerciseId,
    extraId,
    monthId,
    weekId,
    dayId,
    date,
    status,
    sets,
    reps,
    weight,
    rest,
    load,
    effort,
    index,
    subIndex,
    totalSet,
    type,
  } = req.body;
    let exactDate;
    try {
      if (date && typeof date === 'string') {
        const dateWithZ = date.replace(' ', 'T') + 'Z';
        exactDate = new Date(dateWithZ);
        if (isNaN(exactDate.getTime())) {
          throw new Error('Invalid date');
        }
      } else {
        exactDate = date; 
      }
    } catch (dateError) {
      console.warn('Date parsing failed, using original:', dateError.message);
      exactDate = date;
    }
  const updateData = {
    split,
    exerciseId,
    extraId,
    monthId,
    weekId,
    dayId,
    date:exactDate,
    status,
    sets,
    reps,
    weight,
    rest,
    load,
    effort,
    index,
    subIndex,
    totalSet,
    type,
  };

  try {
    const updatePromise = ExerciseHistory.findOneAndUpdate(
      { dataId, userId },
      updateData,
      { new: true, lean: true }
    );

    const checkpointPromise = updateCheckpoint();

    const [updatedDoc] = await Promise.all([updatePromise, checkpointPromise]);

    res.status(200).json({ result: true, updated: updatedDoc });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const getExerciseHistories = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { split, dataId, exerciseId, monthId, weekId, dayId } = req.body;
    const query = { userId };
    if (split) query.split = split;
    if (dataId) query.dataId = dataId;
    if (exerciseId) query.exerciseId = exerciseId;
    if (monthId) query.monthId = monthId;
    if (weekId) query.weekId = weekId;
    if (dayId) query.dayId = dayId;

    const exerciseHistories = await ExerciseHistory.find(query).lean();
    res.status(200).json(exerciseHistories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExerciseHistoriesByUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    const exerciseHistories = await ExerciseHistory.find({ userId }).lean();
    res.status(200).json(exerciseHistories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExerciseHistory = asyncHandler(async (req, res) => {
  try {
    const exerciseHistory = await ExerciseHistory.findById(
      req.params.id
    ).lean();
    if (!exerciseHistory) {
      return res
        .status(404)
        .json({ result: false, message: "Exercise history not found" });
    }
    res.status(200).json(exerciseHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const deleteDayHistory = asyncHandler(async (req, res) => {
  try {
    const { dayId } = req.body;
    const userId = req.user._id;

    if (!dayId) {
      return res
        .status(400)
        .json({ result: false, message: "dayId is required in body" });
    }

    const deletePromise = ExerciseHistory.deleteMany({ 
      dayId: dayId, 
      userId: userId 
    });
    
    const checkpointPromise = updateCheckpoint();

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (deletedDoc) {
      return res.status(200).json({ result: true });
    }

    res.status(404).json({ result: false, message: "Document not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteExerciseHistory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const filters = [];
    if (mongoose.isValidObjectId(id)) filters.push({ _id: id });
    filters.push({ dataId: id });

    if (filters.length === 0) {
      return res
        .status(400)
        .json({ result: false, message: "Invalid ID format" });
    }

    const deletePromise = ExerciseHistory.findOneAndDelete({ $or: filters });
    const checkpointPromise = updateCheckpoint();

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (deletedDoc) {
      return res.status(200).json({ result: true });
    }

    res.status(404).json({ result: false, message: "Document not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const getRadarChartExerciseHistory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const tag = await Tags.findOne({ title: "radar_chart_exercise" })
      .select("_id")
      .lean();

    if (!tag) {
      return res.status(200).json(null);
    }

    const [exercises, exerciseHistories] = await Promise.all([
      Exercise.find().select("_id title titleTranslations tags").lean(),
      ExerciseHistory.find({ userId }).lean(),
    ]);

    const tagIdStr = tag._id.toString();

    const result = exercises
      .filter((ex) => ex.tags.map((t) => t?.toString()).includes(tagIdStr))
      .map((exercise) => ({
        exerciseId: exercise._id.toString(),
        exerciseName: exercise.title,
        exerciseNameTranslations:exercise.titleTranslations,
        exerciseHistoryData: exerciseHistories.filter(
          (h) => h.exerciseId === exercise._id.toString()
        ),
      }));

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addExerciseHistory,
  updateExerciseHistory,
  getExerciseHistories,
  getExerciseHistoriesByUser,
  getExerciseHistory,
  deleteExerciseHistory,
  getRadarChartExerciseHistory,
  updateExerciseHistoryBulk,
  deleteDayHistory
};
