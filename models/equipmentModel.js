const mongoose = require("mongoose");

const equipmentSchema = mongoose.Schema(
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
    description: {
      type: String,
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    link: {
      type: String,
    },
    linkTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    collections: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Collection",
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
