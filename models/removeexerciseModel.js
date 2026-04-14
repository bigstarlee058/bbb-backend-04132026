const mongoose = require("mongoose");

const removeexerciseSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    dataId: {
      type: String,
    },
    monthId: {
      type: String,
    },
    exerciseId: {
      type: String,
    },
    split: {
      type: String,
    },
    weekId: {
      type: String,
    },
    dayId: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("RemoveExercise", removeexerciseSchema);
