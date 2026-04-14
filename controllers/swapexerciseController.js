const asyncHandler = require("express-async-handler");
const SwapExercise = require("../models/swapexerciseModel");
const Setting = require("../models/settingModel");
const Exercise = require("../models/exerciseModel");
const addSwapExercise = asyncHandler(async (req, res) => {
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
      insertIndex,
    } = req.body;
    const userId = req.user._id;
    const documentToInsert = {
      userId,
      dataId,
      split,
      monthId,
      weekId,
      dayId,
      date,
      exerciseId,
      exerciseJson,
      insertIndex,
    };

    const [swapexercise] = await Promise.all([
      SwapExercise.create(documentToInsert),
      Setting.updateOne({}, { swapexerciseCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: !!swapexercise });
  } catch (error) {
    console.log(error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const deleteSwapExercise = asyncHandler(async (req, res) => {
  try {
    const [result] = await Promise.all([
      SwapExercise.findOneAndDelete({ dataId: req.query.dataId }),
      Setting.updateOne({}, { swapexerciseCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: !!result });
  } catch (error) {
    console.log(error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const removeSwapExercise = asyncHandler(async (req, res) => {
  try {
    const [result] = await Promise.all([
      SwapExercise.findOneAndDelete({ _id: req.params.id }),
      Setting.updateOne({}, { swapexerciseCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: !!result });
  } catch (error) {
    console.log(error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const getSwapExercises = asyncHandler(async (req, res) => {
  try {
    const { monthId, weekId, dayId, split } = req.body;
    const userId = req.user._id;

    const query = { userId: userId.toString() };
    if (monthId) query.monthId = monthId;
    if (weekId) query.weekId = weekId;
    if (dayId) query.dayId = dayId;
    if (split) query.split = split;

    let swapExercises = await SwapExercise.find(query).lean();

    const exerciseIds = swapExercises.map((doc) => doc.exerciseId);
    const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();

    const exerciseMap = {};
    exercises.forEach((ex) => {
      exerciseMap[ex._id.toString()] = ex;
    });

    swapExercises = swapExercises.map((doc) => {
      let exerciseJson = {};
      try {
        exerciseJson = typeof doc.exerciseJson === "string" ? JSON.parse(doc.exerciseJson) : (doc.exerciseJson || {});
      } catch (err) {
        exerciseJson = {};
      }

      const exerciseData = exerciseMap[doc.exerciseId] || {};

      exerciseJson.nameTranslations = exerciseData.titleTranslations || {};
      exerciseJson.descriptionTranslations = exerciseData.descriptionTranslations || {};
      exerciseJson.vimeoIdTranslations = exerciseData.vimeoIdTranslations || {};
      exerciseJson.thumbnailTranslations = exerciseData.thumbnailTranslations || {};
      exerciseJson.videoThumbnailTranslations = exerciseData.videoThumbnailTranslations || {};

      doc.exerciseJson = JSON.stringify(exerciseJson);

      return doc;
    });

    res.status(200).json(swapExercises);
  } catch (error) {
    console.log(error);
    res.status(200).json([]);
  }
});

const getSwapExercise = asyncHandler(async (req, res) => {
  try {
    const swapexercise = await SwapExercise.findOne({
      _id: req.params.id,
    }).lean();
    res.status(200).json(swapexercise || {});
  } catch (error) {
    console.log(error);
    res.status(200).json({});
  }
});

module.exports = {
  addSwapExercise,
  deleteSwapExercise,
  getSwapExercise,
  getSwapExercises,
  removeSwapExercise,
};
