const mongoose = require("mongoose");

const achievementsindividualSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    image: {
      type: String,
    },
    targettype: {
      type: String,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AchievementsTarget",
    },
    targettype: {
      type: String,
      enum: ["Others", "Tags"], 
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targettypeRef",
    },
    value: {
      type: Number,
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

achievementsindividualSchema.virtual("targettypeRef").get(function () {
  if (this.targettype === "Others") return "AchievementsTarget";
  if (this.targettype === "Tags") return "Tags";
  return null;
});

module.exports = mongoose.model("AchievementsIndividual", achievementsindividualSchema);
