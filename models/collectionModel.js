const mongoose = require("mongoose");

const collectionSchema = mongoose.Schema(
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
    isFeatured: {
      type: Boolean,
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

module.exports = mongoose.model("Collection", collectionSchema);
