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
  guide: { type: String },
  guideTranslations: {
    type: Map,
    of: String,
    default: {}
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
});

const circuitSchema = mongoose.Schema({
  round: { type: Number },
  typeId: { type: Number },
  formats: { type: [String] },
  circuitExercises: [dayExerciseSchema],
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
  formats: { type: [String] },
  warmups: [dayWarmupSchema],
  exercises: [dayExerciseSchema],
  circuits: [circuitSchema]
});

const PumpDay = mongoose.model("PumpDay", daySchema);

module.exports = PumpDay;
