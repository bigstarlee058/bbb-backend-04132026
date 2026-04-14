const mongoose = require("mongoose");

const exercisestatusSchema = mongoose.Schema(
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
    exerciseId: {
        type: String,
    },
    totalWeight: {
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
    type: {
        type: String,
    },
    totalRIR: {
        type: String,
    },
    totalSet: {
        type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("ExerciseStatus", exercisestatusSchema);
