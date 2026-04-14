const mongoose = require("mongoose");

const achievementsSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    achievements_date: {
        type: Date,
    },
    achievements_title: {
        type: String,
    },
    achievements_subtitle: {
        type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Achievements", achievementsSchema);
