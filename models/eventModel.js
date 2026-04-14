const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ["wp", "rc", "admin"],
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    details: {
      type: String,
      default: "",
    },
    performedBy: {
      type: String,
      default: null,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ source: 1 });
eventSchema.index({ action: 1 });
eventSchema.index({ success: 1 });

module.exports = mongoose.model("Event", eventSchema);