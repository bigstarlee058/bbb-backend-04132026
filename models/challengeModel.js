const mongoose = require("mongoose");

const ChallengeSchema = mongoose.Schema(
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
    link: {
      type: String,
    },
    linkTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    buttonText: {
      type: String,
    },
    buttonTextTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    photo: {
      type: String,
    },
    photoTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    isHide: {
      type: Boolean,
      default: false
    },
    joinedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Challenge", ChallengeSchema);
