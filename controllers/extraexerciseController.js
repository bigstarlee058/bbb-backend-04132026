const asyncHandler = require("express-async-handler");
const ExtraExercise = require("../models/extraexerciseModel");
const Setting = require("../models/settingModel");

const addExtraExercise = asyncHandler(async (req, res) => {
  try {
    const {
      dataId,
      split,
      monthId,
      weekId,
      dayId,
      date,
      exerciseId,
      exerciseJson,
    } = req.body;
    const userId = req.user._id;

    const extraExercise = await ExtraExercise.create({
      userId,
      dataId,
      split,
      monthId,
      weekId,
      dayId,
      date,
      exerciseId,
      exerciseJson,
    });

    if (!extraExercise) {
      return res.status(200).json({ result: false });
    }

    Setting.updateOne({}, { extraexerciseCheckpoint: new Date() });
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error adding extra exercise:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteExtraExercise = asyncHandler(async (req, res) => {
  try {
    const deletePromise = ExtraExercise.findOneAndDelete({
      dataId: req.query.dataId,
    });
    const checkpointPromise = Setting.updateOne(
      {},
      { extraexerciseCheckpoint: new Date() }
    );

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (!deletedDoc) {
      return res
        .status(404)
        .json({ result: false, message: "Extra exercise not found" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error deleting extra exercise:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const removeExtraExercise = asyncHandler(async (req, res) => {
  try {
    const deletePromise = ExtraExercise.findOneAndDelete({
      _id: req.params.id,
    });
    const checkpointPromise = Setting.updateOne(
      {},
      { extraexerciseCheckpoint: new Date() }
    );

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (!deletedDoc) {
      return res
        .status(404)
        .json({ result: false, message: "Extra exercise not found" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error removing extra exercise:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExtraExercises = asyncHandler(async (req, res) => {
  try {
    const { monthId, weekId, dayId, split } = req.body;
    const userId = req.user._id;

    const query = { userId };
    if (monthId) query.monthId = monthId;
    if (weekId) query.weekId = weekId;
    if (dayId) query.dayId = dayId;
    if (split) query.split = split;

    const extraExercises = await ExtraExercise.find(query).lean();
    res.status(200).json(extraExercises);
  } catch (error) {
    console.error("Error fetching extra exercises:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExtraExercise = asyncHandler(async (req, res) => {
  try {
    const extraExercise = await ExtraExercise.findById(req.params.id).lean();

    if (!extraExercise) {
      return res
        .status(404)
        .json({ result: false, message: "Extra exercise not found" });
    }

    res.status(200).json(extraExercise);
  } catch (error) {
    console.error("Error fetching extra exercise:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addExtraExercise,
  deleteExtraExercise,
  getExtraExercise,
  getExtraExercises,
  removeExtraExercise,
};
