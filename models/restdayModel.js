const mongoose = require("mongoose");

const restdaySchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {}
    },
    vimeoId: {
      type: String,
    },
    vimeoIdTranslations: {
      type: Map,
      of: String,
      default: {}
    },
    description: {
      type: String,
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {}
    },
    equipments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Equipment",
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("RestDay", restdaySchema);
