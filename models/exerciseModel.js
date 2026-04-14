const mongoose = require("mongoose");

const exerciseSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    vimeoId: {
      type: String,
    },
    vimeoIdTranslations: {
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
    videoThumbnail: {
      type: String,
    },
    videoThumbnailTranslations: {
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
    guide: {
      type: String,
    },
    categories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
    },
    tags: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Tags",
    },
    usedEquipments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Equipment",
    },
    relatedExercises: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Exercise",
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Exercise", exerciseSchema);
