const mongoose = require("mongoose");

const FaqsSchema = mongoose.Schema(
  {
    question: {
      type: String,
    },
    questionTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    answer: {
      type: String,
    },
    answerTranslations: {
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

module.exports = mongoose.model("Faqs", FaqsSchema);
