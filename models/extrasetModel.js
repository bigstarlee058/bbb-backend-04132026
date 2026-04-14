const mongoose = require("mongoose");

const extrasetSchema = mongoose.Schema(
  {
    userId: {
      type: String,
    },
    dataId: {
      type: String,
    },
    date: {
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
    type: {
      type: String,
    },
    extraId: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("ExtraSet", extrasetSchema);
