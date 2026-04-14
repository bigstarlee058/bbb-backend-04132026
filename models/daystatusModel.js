const mongoose = require("mongoose");

const daystatusSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    split: {
      type: String,
    },
    dataId: {
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
    status: {
      type: String,
    },
    title: {
      type: String,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    type: {
      type: String,
    },
    totalWeight: {
      type: String,
    },
    completedExerciseCount: {
      type: String,
    },
    completedExercise: {
      type: String,
    },
    averageRIR: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("DayStatus", daystatusSchema);
