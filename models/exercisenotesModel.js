const mongoose = require("mongoose");

const exercisenotesSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    exerciseId: {
      type: String,
    },
    date: {
      type: Date,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("ExerciseNotes", exercisenotesSchema);
