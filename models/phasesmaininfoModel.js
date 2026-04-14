const mongoose = require("mongoose");

const phasesmaininfoSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    thumbnail: {
      type: String,
    },
    thumbnailTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    contenttitle: {
      type: String,
    },
    contenttitleTranslations: {
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
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("PhasesMainInfo", phasesmaininfoSchema);