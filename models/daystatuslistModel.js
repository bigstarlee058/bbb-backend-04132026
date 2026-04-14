const mongoose = require("mongoose");

const daystatuslistSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    date: {
      type: Date,
    },
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("DayStatusList", daystatuslistSchema);
