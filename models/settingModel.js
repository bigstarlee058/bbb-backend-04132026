const mongoose = require("mongoose");

const settingSchema = mongoose.Schema(
  {
    monthCover: {
      type: String,
    },
    workoutCheckpoint: {
      type: Date,
    },
    equipmentCheckpoint: {
      type: Date,
    },
    bonusCheckpoint: {
      type: Date,
    },
    exercisehistoryCheckpoint: {
      type: Date,
    },
    exercisestatusCheckpoint: {
      type: Date,
    },
    daystatusCheckpoint: {
      type: Date,
    },
    extrasetCheckpoint: {
      type: Date,
    },
    removeexerciseCheckpoint: {
      type: Date,
    },
    exercisenotesCheckpoint: {
      type: Date,
    },
    extraexerciseCheckpoint: {
      type: Date,
    },
    swapexerciseCheckpoint: {
      type: Date,
    },
    daystatuslistCheckpoint: {
      type: Date,
    },
    StreakCountCheckpoint: {
      type: Date,
    },
    AchievementsCheckpoint: {
      type: Date,
    },
    languages: [{
      key: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      inUse: {
        type: Boolean,
        default: false
      }
    }],
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("Setting", settingSchema);
