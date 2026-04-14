const mongoose = require("mongoose");

const exercisehistorySchema = mongoose.Schema(
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
    extraId: {
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
    sets: {
        type: String,
    },
    reps: {
        type: String,
    },
    weight: {
        type: String,
    },
    rest: {
        type: String,
    },
    load: {
        type: String,
    },
    effort: {
        type: String,
    },
    index: {
        type: String,
    },
    subIndex: {
        type: String,
    },
    totalSet: {
        type: String,
    },
    type: {
        type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("ExerciseHistory", exercisehistorySchema);
