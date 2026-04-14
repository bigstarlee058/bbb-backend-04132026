const asyncHandler = require("express-async-handler");
const ExerciseNotes = require("../models/exercisenotesModel");
const Setting = require("../models/settingModel");

const updateCheckpoint = async () => {
  await Setting.updateOne({}, { exercisenotesCheckpoint: new Date() });
};
const addExerciseNotes = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { exerciseId, date, note } = req.body;

    const newNote = await ExerciseNotes.create({
      userId,
      exerciseId,
      date,
      note,
    });

    if (!newNote) {
      return res
        .status(500)
        .json({ result: false, message: "Failed to create exercise notes" });
    }

    updateCheckpoint(); // run in background, don't block response
    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error adding exercise notes:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

// Get all exercise notes for a user (optional filter by exerciseId)
const getExerciseNoteses = asyncHandler(async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { exerciseId } = req.body;

    const query = { userId };
    if (exerciseId) query.exerciseId = exerciseId;

    const notes = await ExerciseNotes.find(query).lean();
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching exercise notes:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

// Get a single exercise note by ID
const getExerciseNotes = asyncHandler(async (req, res) => {
  try {
    const note = await ExerciseNotes.findById(req.params.id).lean();

    if (!note) {
      return res
        .status(404)
        .json({ result: false, message: "Exercise note not found" });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("Error fetching exercise note:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

// Delete exercise notes by ID
const deleteExerciseNotes = asyncHandler(async (req, res) => {
  try {
    const deletePromise = ExerciseNotes.findByIdAndDelete(req.params.id);
    const checkpointPromise = updateCheckpoint();

    const [deletedDoc] = await Promise.all([deletePromise, checkpointPromise]);

    if (!deletedDoc) {
      return res
        .status(404)
        .json({ result: false, message: "Exercise note not found" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error("Error deleting exercise note:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addExerciseNotes,
  getExerciseNotes,
  getExerciseNoteses,
  deleteExerciseNotes,
};
