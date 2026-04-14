const asyncHandler = require("express-async-handler");
const ExtraSet = require("../models/extrasetModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = async () => {
  await Setting.updateOne({}, { extrasetCheckpoint: new Date() });
};
const addExtraSet = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { dataId, date, sets, reps, weight, rest, load, type, extraId } =
      req.body;

    const extraset = await ExtraSet.create({
      userId,
      dataId,
      date,
      sets,
      reps,
      weight,
      rest,
      load,
      type,
      extraId,
    });

    if (!extraset) {
      return res
        .status(500)
        .json({ result: false, message: "Failed to create extra set" });
    }

    updateCheckpoint();
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error adding extra set:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const getExtraSets = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { dataId } = req.body;

    const query = { userId };
    if (dataId) query.dataId = dataId;

    const extrasets = await ExtraSet.find(query).lean();
    res.status(200).json(extrasets);
  } catch (error) {
    console.error("Error fetching extra sets:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getExtraSet = asyncHandler(async (req, res) => {
  try {
    const extraset = await ExtraSet.findById(req.params.id).lean();

    if (!extraset) {
      return res
        .status(404)
        .json({ result: false, message: "Extra set not found" });
    }

    res.status(200).json(extraset);
  } catch (error) {
    console.error("Error fetching extra set:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteExtraSet = asyncHandler(async (req, res) => {
  try {
    const deletePromise = ExtraSet.findByIdAndDelete(req.params.id);
    const checkpointPromise = updateCheckpoint();

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (!deletedDoc) {
      return res
        .status(404)
        .json({ result: false, message: "Extra set not found" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error deleting extra set:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addExtraSet,
  getExtraSet,
  getExtraSets,
  deleteExtraSet,
};
