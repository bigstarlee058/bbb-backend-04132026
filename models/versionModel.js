const mongoose = require("mongoose");

const versionSchema = mongoose.Schema(
  {
    android: {
      version: {
        type: String,
        default: "1.0",
      },
      forceUpdate: {
        type: Boolean,
        default: false,
      },
      showPopUp : {
        type: Boolean,
        default: false,
      },
    },
    ios: {
      version: {
        type: String,
        default: "1.0",
      },
      forceUpdate: {
        type: Boolean,
        default: false,
      },
      showPopUp : {
        type: Boolean,
        default: false,
      },
    },
    update_title: {
      type: String,
      default: "New version available",
    },
    update_titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    update_message: {
      type: String,
    },
    update_messageTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    latest_version: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Version", versionSchema);
