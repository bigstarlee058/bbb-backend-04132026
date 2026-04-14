const asyncHandler = require("express-async-handler");
const DayStatusList = require("../models/daystatuslistModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = async () => {
  await Setting.updateOne({}, { daystatuslistCheckpoint: new Date() });
};

const addDayStatusList = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { date, status } = req.body;

    const daystatuslist = await DayStatusList.create({ userId, date, status });
    if (daystatuslist) await updateCheckpoint();

    res.status(200).json({ result: !!daystatuslist });
  } catch {
    res.status(200).json({ result: false });
  }
});

const getDayStatusLists = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const daystatusLists = await DayStatusList.find({ userId }).lean();
    res.status(200).json(daystatusLists || []);
  } catch {
    res.status(200).json([]);
  }
});

const getDayStatusList = asyncHandler(async (req, res) => {
  try {
    const daystatuslist = await DayStatusList.findById(req.params.id).lean();
    res.status(200).json(daystatuslist || {});
  } catch {
    res.status(200).json({});
  }
});

const deleteDayStatusList = asyncHandler(async (req, res) => {
  try {
    const result = await DayStatusList.findByIdAndDelete(req.params.id).lean();
    if (result) await updateCheckpoint();

    res.status(200).json({ result: !!result });
  } catch {
    res.status(200).json({ result: false });
  }
});

module.exports = {
  addDayStatusList,
  getDayStatusLists,
  getDayStatusList,
  deleteDayStatusList,
};
