const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const DayStatus = require("../models/daystatusModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = async () => {
  await Setting.updateOne({}, { daystatusCheckpoint: new Date() });
};

// Add a new day status
const addDayStatus = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      split,
      dataId,
      monthId,
      weekId,
      dayId,
      date,
      status,
      title,
      startTime,
      endTime,
      type,
      totalWeight,
      completedExerciseCount,
      completedExercise,
      averageRIR,
    } = req.body;

    const documentToInsert = {
      userId,
      split,
      dataId,
      monthId,
      weekId,
      dayId,
      date,
      status,
      title,
      startTime,
      endTime,
      type,
      totalWeight,
      completedExerciseCount,
      completedExercise,
      averageRIR,
    };

    const daystatus = await DayStatus.create(documentToInsert);

    if (!daystatus) {
      return res
        .status(500)
        .json({ result: false, message: "Failed to create day status" });
    }

    await updateCheckpoint();
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error adding day status:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

// Update an existing day status
const updateDayStatus = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      split,
      dataId,
      monthId,
      weekId,
      dayId,
      date,
      status,
      title,
      startTime,
      endTime,
      type,
      totalWeight,
      completedExerciseCount,
      completedExercise,
      averageRIR,
    } = req.body;

    const updateData = {
      split,
      monthId,
      weekId,
      dayId,
      date,
      status,
      title,
      startTime,
      endTime,
      type,
      totalWeight,
      completedExerciseCount,
      completedExercise,
      averageRIR,
    };

    const result = await DayStatus.findOneAndUpdate(
      { dataId, userId },
      updateData,
      { new: true, lean: true }
    );

    if (!result) {
      return res
        .status(404)
        .json({ result: false, message: "Day status not found" });
    }

    await updateCheckpoint();
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error updating day status:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

// Get all day statuses matching filters
const getDayStatuses = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { split, monthId, weekId, dayId } = req.body;

    const query = { userId };
    if (split) query.split = split;
    if (monthId) query.monthId = monthId;
    if (weekId) query.weekId = weekId;
    if (dayId) query.dayId = dayId;

    const daystatuses = await DayStatus.find(query).lean();
    res.status(200).json(daystatuses);
  } catch (error) {
    console.error("Error fetching day statuses:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single day status by ID
const getDayStatus = asyncHandler(async (req, res) => {
  try {
    const daystatus = await DayStatus.findById(req.params.id).lean();
    if (!daystatus) {
      return res.status(404).json({ message: "Day status not found" });
    }
    res.status(200).json(daystatus || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a day status by ObjectId or dataId
const deleteDayStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const filters = [];
    if (mongoose.isValidObjectId(id)) filters.push({ _id: id });
    filters.push({ dataId: id });

    if (!filters.length) {
      return res
        .status(400)
        .json({ result: false, message: "Invalid ID format" });
    }

    const result = await DayStatus.findOneAndDelete({ $or: filters }).lean();

    if (!result) {
      return res
        .status(404)
        .json({ result: false, message: "Day status not found" });
    }

    await updateCheckpoint();
    res.status(200).json({ result: true });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addDayStatus,
  updateDayStatus,
  getDayStatus,
  getDayStatuses,
  deleteDayStatus,
};
