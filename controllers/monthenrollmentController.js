const asyncHandler = require("express-async-handler");
const DayStatus = require("../models/daystatusModel");
const Month = require("../models/workoutModel");

const getMonthEnrollment = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const oldestDayStatus = await DayStatus.findOne({ userId })
      .sort({ date: 1 })
      .select("date")
      .lean();

    if (!oldestDayStatus?.date) return res.status(200).json([]);

    const oldestDate = oldestDayStatus.date;
    const startOfOldestMonth = new Date(
      oldestDate.getFullYear(),
      oldestDate.getMonth(),
      1
    );

    const monthData = await Month.find({
      $or: [
        { startDate: { $gte: startOfOldestMonth } },
        { endDate: { $gte: startOfOldestMonth } },
      ],
    })
      .select("_id index startDate endDate")
      .sort({ startDate: 1 })
      .lean();

    res.status(200).json(monthData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getMonthEnrollment,
};
