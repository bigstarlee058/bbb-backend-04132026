const asyncHandler = require("express-async-handler");
const StreakCount = require("../models/streakcountModel");
const Setting = require("../models/settingModel");

const updateStreakCount = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { count } = req.body;

    const options = { new: true, upsert: true };

    const [updatedStreak] = await Promise.all([
      StreakCount.findOneAndUpdate({ userId }, { count }, options).lean(),
      Setting.updateOne({}, { StreakCountCheckpoint: new Date() }),
    ]);

    res.status(200).json({ result: true, streak: updatedStreak });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

const getStreakCount = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const streak = await StreakCount.findOne({ userId }).lean();

    res.status(200).json(streak || { count: 0 });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  updateStreakCount,
  getStreakCount,
};
