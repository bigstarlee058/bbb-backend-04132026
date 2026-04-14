const mongoose = require("mongoose");

const StreakCountSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    count: {
      type: String,
      default: "0"
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("StreakCount", StreakCountSchema);
