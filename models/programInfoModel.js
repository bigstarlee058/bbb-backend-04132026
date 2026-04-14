const mongoose = require("mongoose");

const SectionSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    description: {
      type: String,
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    variations: {
      type: [String],
      default: ["3", "4", "5"]
    },
    formats: {
      type: [String],
      default: ["A", "B", "C"]
    },
    vimeoId: {
      type: String,
    },
    vimeoIdTranslations: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Section", SectionSchema);
