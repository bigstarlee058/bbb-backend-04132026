const mongoose = require("mongoose");

const usageSchema = mongoose.Schema({
  collectionName: {
    type: String,
    required: true
  },
  documentId: {
    type: String,
    required: true
  },
  fieldPath: {
    type: String,
    required: true
  },
  languageKey: {
    type: String,
    default: null
  }
}, { _id: false });

const imageRegistrySchema = mongoose.Schema(
  {
    imageId: {
      type: String,
      required: true,
      unique: true
    },
    contentHash: {
      type: String,
      required: true,
      unique:true,
      index: true
    },
    storageUrl: {
      type: String,
      required: true
    },
    usageCount: {
      type: Number,
      default: 0
    },
    usedBy: [usageSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ImageRegistry", imageRegistrySchema);