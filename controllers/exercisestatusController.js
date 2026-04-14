const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ExerciseStatus = require("../models/exercisestatusModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = async () => {
  await Setting.updateOne({}, { exercisestatusCheckpoint: new Date() });
};
const addExerciseStatus = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const {
      split,
      dataId,
      exerciseId,
      totalWeight,
      monthId,
      weekId,
      dayId,
      date,
      status,
      type,
      totalRIR,
      totalSet,
    } = req.body;

    const newStatus = await ExerciseStatus.create({
      userId,
      split,
      dataId,
      exerciseId,
      totalWeight,
      monthId,
      weekId,
      dayId,
      date,
      status,
      type,
      totalRIR,
      totalSet,
    });

    if (!newStatus) {
      return res
        .status(500)
        .json({ result: false, message: "Failed to create exercise status" });
    }

    updateCheckpoint();
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error adding exercise status:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const updateExerciseStatus = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const {
      split,
      dataId,
      exerciseId,
      totalWeight,
      monthId,
      weekId,
      dayId,
      date,
      status,
      type,
      totalRIR,
      totalSet,
    } = req.body;

    const result = await ExerciseStatus.findOneAndUpdate(
      { dataId, userId },
      {
        split,
        exerciseId,
        totalWeight,
        monthId,
        weekId,
        dayId,
        date,
        status,
        type,
        totalRIR,
        totalSet,
      },
      { new: true, lean: true }
    );

    if (!result) {
      return res
        .status(404)
        .json({ result: false, message: "Exercise status not found" });
    }

    updateCheckpoint();
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error updating exercise status:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const getExerciseStatuses = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { split, dataId, exerciseId, monthId, weekId, dayId } = req.body;

    const query = { userId };
    if (split) query.split = split;
    if (dataId) query.dataId = dataId;
    if (exerciseId) query.exerciseId = exerciseId;
    if (monthId) query.monthId = monthId;
    if (weekId) query.weekId = weekId;
    if (dayId) query.dayId = dayId;

    const statuses = await ExerciseStatus.find(query).lean();
    res.status(200).json(statuses);
  } catch (error) {
    console.error("Error fetching exercise statuses:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExerciseStatusByUser = asyncHandler(async (req, res) => {
  try {
    const histories = await ExerciseStatus.find({
      userId: req.params.id,
    }).lean();
    res.status(200).json(histories);
  } catch (error) {
    console.error("Error fetching exercise statuses by user:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExerciseStatus = asyncHandler(async (req, res) => {
  try {
    const statusDoc = await ExerciseStatus.findById(req.params.id).lean();
    if (!statusDoc) {
      return res
        .status(404)
        .json({ result: false, message: "Exercise status not found" });
    }
    res.status(200).json(statusDoc);
  } catch (error) {
    console.error("Error fetching exercise status:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteExerciseStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const filters = [];
    if (mongoose.isValidObjectId(id)) filters.push({ _id: id });
    filters.push({ dataId: id });

    const deletePromise = ExerciseStatus.findOneAndDelete({ $or: filters });
    const checkpointPromise = updateCheckpoint();

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (!deletedDoc) {
      return res
        .status(404)
        .json({ result: false, message: "Exercise status not found" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error deleting exercise status:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addExerciseStatus,
  updateExerciseStatus,
  getExerciseStatus,
  getExerciseStatusByUser,
  getExerciseStatuses,
  deleteExerciseStatus,
};
