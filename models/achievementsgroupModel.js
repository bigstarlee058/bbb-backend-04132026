const mongoose = require("mongoose");

const achievementsgroupSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    type: {
      type: String,
    },
    achievements: [{
        index: {
            type: Number
        },
        achievementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AchievementsIndividual",
        }
    }],
    description: {
      type: String,
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    thumbnail: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("AchievementsGroup", achievementsgroupSchema);
