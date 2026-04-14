const asyncHandler = require("express-async-handler");
const AchievementsTarget = require("../models/achievementstargetModel");
const { getSortInfo } = require("../utils/utils");

const getAchievementsTargetsAdmin = asyncHandler(async (req, res) => {
  let { page = 1, perPage = 10, search, sortBy } = req.query;
  page = Math.max(1, parseInt(page));
  perPage = Math.max(1, parseInt(perPage));

  try {
    const matchStage = search
      ? { $match: { title: { $regex: search, $options: "i" } } }
      : null;

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : null;
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

    const [result] = await AchievementsTarget.aggregate(pipeline);

    res.status(200).json({
      count: result?.total?.[0]?.count || 0,
      achievementsTargets: result?.data || [],
    });
  } catch (error) {
    console.error("Error fetching targets:", error);
    res
      .status(200)
      .json({ count: 0, achievementsTargets: [], message: error.message });
  }
});

const getAllAchievementsTargets = asyncHandler(async (req, res) => {
  const achievementsTargets = await AchievementsTarget.find().lean();
  res.status(200).json(achievementsTargets);
});

const getAchievementsTargetAdmin = asyncHandler(async (req, res) => {
  const achievementsTarget = await AchievementsTarget.findById(
    req.params.id
  ).lean();
  if (!achievementsTarget) {
    return res.status(404).json({ error: "Achievement target not found" });
  }
  res.status(200).json(achievementsTarget);
});

const getAchievementsTargetTitlesAdmin = asyncHandler(async (req, res) => {
  const filterString = req.query.filterString || "";
  const filteredAchievementsTargets = await AchievementsTarget.find(
    { title: { $regex: filterString, $options: "i" } },
    { title: 1 }
  ).lean();
  res.status(200).json(filteredAchievementsTargets);
});

const addAchievementsTargetAdmin = asyncHandler(async (req, res) => {
  const { title, titleTranslations } = req.body;
  const data = { title };
  if (titleTranslations) {
    try {
      data.titleTranslations = typeof titleTranslations === 'string'
        ? JSON.parse(titleTranslations)
        : titleTranslations;
    } catch (error) {
      console.error("Error parsing titleTranslations:", error);
    }
  }
  const achievementsTarget = await AchievementsTarget.create({ data });

  if (!achievementsTarget) {
    return res
      .status(500)
      .json({ result: false, message: "Failed to create achievement target" });
  }

  res.status(200).json({ result: true });
});

const updateAchievementsTargetAdmin = asyncHandler(async (req, res) => {
  const { _id, title, titleTranslations } = req.body;
  const updateData = { title };
  if (titleTranslations) {
    try {
      updateData.titleTranslations = typeof titleTranslations === 'string'
        ? JSON.parse(titleTranslations)
        : titleTranslations;
    } catch (error) {
      console.error("Error parsing titleTranslations:", error);
    }
  }
  const updated = await AchievementsTarget.findByIdAndUpdate(
    _id,
    updateData,
    { new: true }
  );

  if (!updated) {
    return res
      .status(404)
      .json({ result: false, message: "Achievement target not found" });
  }

  res.status(200).json({ result: true });
});

const deleteAchievementsTargetAdmin = asyncHandler(async (req, res) => {
  const deleted = await AchievementsTarget.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res
      .status(404)
      .json({ result: false, message: "Achievement target not found" });
  }
  res.status(200).json({ result: true });
});

module.exports = {
  addAchievementsTargetAdmin,
  updateAchievementsTargetAdmin,
  deleteAchievementsTargetAdmin,
  getAchievementsTargetAdmin,
  getAchievementsTargetsAdmin,
  getAllAchievementsTargets,
  getAchievementsTargetTitlesAdmin,
};
