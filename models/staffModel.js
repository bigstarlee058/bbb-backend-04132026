const mongoose = require("mongoose");

const StaffSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    location: {
      type: String,
    },
    type: {
      type: Number,
    },
    bio: {
      type: String,
    }, 
    bioTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    link: {
      type: String,
      default: '',
    },
    linkedin: {
      type: String,
      default: '',
    },
    tiktok: {
      type: String,
      default: '',
    },
    facebook: {
      type: String,
      default: '',
    },
    twitter: {
      type: String,
      default: '',
    },
    photo: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Staff", StaffSchema);
