const mongoose = require("mongoose");

const popupworkoutSchema = mongoose.Schema(
  {
    vimeoId: {
      type: String,
    },
    vimeoTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    imgUrl: {
      type: String,
    },
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
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Popupworkout", popupworkoutSchema);
