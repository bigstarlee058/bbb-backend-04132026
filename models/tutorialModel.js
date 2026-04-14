const mongoose = require("mongoose");

const tutorialSchema = mongoose.Schema(
  {
    vimeoId: {
      type: String,
    },
    vimeoIdTranslations: {
      type: Map,
      of: String,
      default: {}
    },
     category: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
    },
    thumbnailTranslations: {
      type: Map,
      of: String,
      default: {}
    },
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {}
    },
    description: {
      type: String,
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {}
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Tutorial", tutorialSchema);
