const mongoose = require('mongoose');

const screenSchema = mongoose.Schema(
  {
    vimeoId: {
      type: String,
    },
    vimeoIdTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    imgUrl: {
      type: String,
    },
    imageLogin: {
      type: String,
    },
    imageSignup: {
      type: String,
    },
    imageForgot: {
      type: String,
    },
    imageEmailConfirm: {
      type: String,
    },
    imageDashboard: {
      type: String,
    },
    imageStreakCalendar: {
      type: String,
    },
    imageMonthView: {
      type: String,
    },
    imageToday: {
      type: String,
    },
    imageTools: {
      type: String,
    },
    imageExerciseLibrary: {
      type: String,
    },
    imageGraphs: {
      type: String,
    },
    imageAchievement: {
      type: String,
    },
    imageApparel: {
      type: String,
    },
    imageFAQs: {
      type: String,
    },
    imageTutorial: {
      type: String,
    },
    imageSubscription: {
      type: String,
    },
    imageProfile: {
      type: String,
    },
    imageMyProfle: {
      type: String,
    },
    imageSetting: {
      type: String,
    },
    slides: [{
      title: { type: String }, titleTranslations: {
        type: Map,
        of: String,
        default: {},
      }, description: { type: String }, descriptionTranslations: {
        type: Map,
        of: String,
        default: {},
      },
    }],
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model('Screen', screenSchema);
