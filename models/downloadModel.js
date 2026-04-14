const mongoose = require("mongoose");

const downloadSchema = mongoose.Schema(
  {
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
    pdf: {
      type: String,
    },
    pdfTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    releaseDate: {
      type: Date,
    },
    monthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Month",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Download", downloadSchema);