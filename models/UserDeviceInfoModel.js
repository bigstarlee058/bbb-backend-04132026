const mongoose = require("mongoose");

const userDeviceInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    device: {
      type: String,
    },
    systemName: {
      type: String,
      required:true
    },
    osVersion: {
      type: String,
    },
    appVersion: {
      type: String,
      required:true
    }
  },
  {
    timestamps: true,
    collection: "userdeviceinfo"
  }
);

module.exports = mongoose.model("UserDeviceInfo", userDeviceInfoSchema);
