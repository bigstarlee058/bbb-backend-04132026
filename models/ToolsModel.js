const mongoose = require("mongoose");

const toolsSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    visible: {
      type: Boolean,
    },
    toolName: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true, virtuals: false, versionKey: false },
    id: false,
  }
  ,
  {
    toJSON: { getters: true, virtuals: false, versionKey: false },
    id: false
  }
);

module.exports = mongoose.model("Tools", toolsSchema);
