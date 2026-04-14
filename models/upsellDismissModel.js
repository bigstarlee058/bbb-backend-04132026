const mongoose = require("mongoose");

const upsellDismissSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    upsellId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Upsell",
      required: true,
    },
    dismissType: {
      type: String,
      enum: ["session", "days_30", "never"],
      required: true,
    },
    dismissedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

upsellDismissSchema.index({ userId: 1, upsellId: 1 }, { unique: true });

module.exports = mongoose.model("UpsellDismiss", upsellDismissSchema);