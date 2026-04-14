const mongoose = require("mongoose");

const dayExtraExerciseSchema = mongoose.Schema({
  sets: { type: Number },
  reps: { type: Number },
  weight: { type: Number },
  rest: { type: Number },
  load: { type: Number },
  type: { type: Number },
});

const dayExerciseSchema = mongoose.Schema({
  typeId: { type: Number },
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  name: {type: String},
  thumbnails: {type: String},
  guide: { type: String },
  guideTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  sets: { type: Number },
  reps: { type: Number },
  weight: { type: Number },
  rest: { type: Number },
  formats: { type: [String] },
  extra: [dayExtraExerciseSchema]
});

const dayWarmupSchema = mongoose.Schema({
  typeId: { type: Number },
  warmupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warmup' },
  title: { type: String },
  titleTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  guide: { type: String },
  guideTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  formats: { type: [String] },
  thumbnail: { type: String },
});

const daySchema = mongoose.Schema({
  typeId: { type: Number },
  title: { type: String },
  titleTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  description: { type: String },
  descriptionTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  vimeoId: { type: String },
  vimeoIdTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  vimeoIdTwo: { type: String },
  vimeoIdTwoTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  vimeoIdThree: { type: String },
  vimeoIdThreeTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  thumbnail: { type: String },
  thumbnailTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  thumbnailOne: { type: String },
  thumbnailOneTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  thumbnailTwo: { type: String },
  thumbnailTwoTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  thumbnailThree: { type: String },
  thumbnailThreeTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  formats: { type: [String] },
  warmups: [dayWarmupSchema],
  exercises: [dayExerciseSchema],
});

const weekSchema = mongoose.Schema({
  index: { type: Number },
  title: { type: String },
  titleTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  description: { type: String },
  descriptionTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  vimeoId: { type: String },
  thumbnail: { type: String },
  restdayId: { type: String},
  pumpDayIds: [{  type: mongoose.Schema.Types.ObjectId, ref: 'PumpDay'}],
  days: [daySchema],
});

const monthSchema = mongoose.Schema({
  index: { type: Number },
  title: { type: String },
  titleTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  description: { type: String },
  vimeoId: { type: String },
  vimeoIdTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  thumbnail: { type: String },
  thumbnailTranslations: {
    type: Map,
    of: String,
    default: {},
  },
  startDate: { type: Date },
  endDate: { type: Date },
  weeks: [weekSchema],
}, { timestamps: true });

const Month = mongoose.model("Month", monthSchema);

module.exports = Month;
