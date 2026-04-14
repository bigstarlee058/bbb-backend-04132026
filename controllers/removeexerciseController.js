const asyncHandler = require("express-async-handler");
const RemoveExercise = require("../models/removeexerciseModel");
const Setting = require("../models/settingModel");

const addRemoveExercise = asyncHandler(async (req, res) => {
  try {
    const { dataId, monthId, exerciseId, split, weekId, dayId } = req.body;
    const userId = req.user._id;

    const documentToInsert = {
      userId,
      dataId,
      monthId,
      exerciseId,
      split,
      weekId,
      dayId,
    };

    const [removeexercise] = await Promise.all([
      RemoveExercise.create(documentToInsert),
      Setting.updateOne({}, { removeexerciseCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: !!removeexercise });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteRemoveExercise = asyncHandler(async (req, res) => {
  try {
    const { dataId } = req.query;

    const [result] = await Promise.all([
      RemoveExercise.findOneAndDelete({ dataId }).lean(),
      Setting.updateOne({}, { removeexerciseCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: !!result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const removeRemoveExercise = asyncHandler(async (req, res) => {
  try {
    const [result] = await Promise.all([
      RemoveExercise.findOneAndDelete({ dataId: req.params.id }).lean(),
      Setting.updateOne({}, { removeexerciseCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: !!result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getRemoveExercises = asyncHandler(async (req, res) => {
  try {
    const { monthId, weekId, dayId, split } = req.body;
    const userId = req.user._id;

    const query = { userId };
    if (monthId) query.monthId = monthId;
    if (weekId) query.weekId = weekId;
    if (dayId) query.dayId = dayId;
    if (split) query.split = split;

    const removeexercises = await RemoveExercise.find(query).lean();
    res.status(200).json(removeexercises);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getRemoveExercise = asyncHandler(async (req, res) => {
  try {
    const removeexercise = await RemoveExercise.findOne({
      _id: req.params.id,
    }).lean();
    if (!removeexercise)
      return res
        .status(404)
        .json({ result: false, message: "Remove Exercise not found" });
    res.status(200).json(removeexercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addRemoveExercise,
  deleteRemoveExercise,
  getRemoveExercises,
  getRemoveExercise,
  removeRemoveExercise,
};
