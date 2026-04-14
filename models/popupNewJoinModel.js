const mongoose = require("mongoose");

const popupNewJoinSchema = mongoose.Schema(
  {
    buttonText:{
      type: String,
    },
    buttonTextTranslations:{
      type: Map,
      of: String,
      default: {},
    },
      imgUrl: {
      type: String,
    },
    imgUrlTranslations: {
      type: Map,
      of: String,
      default: {},
    },
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
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("PopupNewJoin", popupNewJoinSchema);
