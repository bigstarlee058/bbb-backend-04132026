const mongoose = require("mongoose");

const warmupSchema = mongoose.Schema(
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
    description: {
      type: String,
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    equipments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Equipment",
    },
    length: {
      type: Number,
    },
    thumbnail: {
      type: String,
    },
    videoThumbnail: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Warmup", warmupSchema);
