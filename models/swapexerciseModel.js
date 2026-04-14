const mongoose = require("mongoose");

const swapexerciseSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    dataId: {
      type: String,
    },
    split: {
      type: String,
    },
    monthId: {
      type: String,
    },
    weekId: {
      type: String,
    },
    dayId: {
      type: String,
    },
    date: {
      type: Date,
    },
    exerciseId: {
      type: String,
    },
    exerciseJson: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    insertIndex: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("SwapExercise", swapexerciseSchema);
