const asyncHandler = require("express-async-handler");
const Achievements = require("../models/achievementsModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = () =>
  Setting.updateOne({}, { AchievementsCheckpoint: new Date() });

const addAchievements = asyncHandler(async (req, res) => {
  const { achievements_date, achievements_title, achievements_subtitle } =
    req.body;

  if (!achievements_date || !achievements_title || !achievements_subtitle) {
    return res.status(400).json({ result:false, error: "All fields are required" });
  }

  const achievements = await Achievements.create({
    userId: req.user._id,
    achievements_date,
    achievements_title,
    achievements_subtitle,
  });

  if (!achievements) {
    return res
      .status(500)
      .json({ result: false, message: "Failed to create achievement" });
  }

  await updateCheckpoint();
  res.status(200).json({ result: true });
});

const getAchievements = asyncHandler(async (req, res) => {
  const achievements = await Achievements.find({ userId: req.user._id }).lean();
  res.status(200).json(achievements);
});

const getAchievement = asyncHandler(async (req, res) => {
  const achievement = await Achievements.findById(req.params.id).lean();
  if (!achievement) {
    return res.status(404).json({ error: "Achievement not found" });
  }
  res.status(200).json(achievement);
});

const deleteAchievement = asyncHandler(async (req, res) => {
  const deleted = await Achievements.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res
      .status(404)
      .json({ result: false, message: "Achievement not found" });
  }

  await updateCheckpoint();
  res.status(200).json({ result: true });
});

module.exports = {
  addAchievements,
  getAchievements,
  getAchievement,
  deleteAchievement,
};
