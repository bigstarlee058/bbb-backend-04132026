const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    uid: {
      type: Number,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
    },
    password: {
      type: String,
    },
    name: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    role: {
      type: Number,
      default: 0,
    },
    singuptype: {
      type: String,
      default: "web",
    },
    active: {
      type: Number,
      default: 0,
    },
    rcUserId: {
      type: String,
    },
    wpLanguage:{
      type: String,
    },
    accessedMonths:[
      {
        monthId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Month",
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    detail: {
      sex: {
        type: Boolean,
      },
      dob: {
        type: Date,
      },
      weight: {
        type: Number,
      },
      height: {
        type: Number,
      },
      waist: {
        type: String,
      },
      hip: {
        type: String,
      },
      midthigh: {
        type: String,
      },
      bodyfat: {
        type: String,
      },
      location: {
        type: String,
      },
      mygoal: {
        type: String,
      },
      avatarUrl: {
        type: String,
      },
      country: {
        type: String,
      },
      state: {
        type: String,
      },
      city: {
        type: String,
      },
    },
    subscription: {
      user_subscription_status: {
        type: String,
        default: "free_user",
      },
      subscription_type: {
        type: String,
      },
      price: {
        type: String,
      },
      purchase_date: {
        type: String,
      },
      end_date: {
        type: String,
      },
      update_source: { type: String, enum: ['admin', 'wp', 'rc'], default: "admin" },
      update_date: { type: Date, default: null },
    },
    experience: {
      type: String,
    },
    level: {
      type: Number,
    },
    note: {
      type: String,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
    ],
    workoutsHistory: [
      {
        monthIndex: {
          type: Number,
        },
        weekIndex: {
          type: Number,
        },
        dayId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        daySplit: {
          type: Number,
        },
        dayIndex: {
          type: Number,
        },
        day: {
          type: String,
        },
        exercises: [
          {
            sets: {
              type: Number,
            },
            reps: {
              type: Number,
            },
            weight: {
              type: Number,
            },
            rest: {
              type: Number,
            },
            type: {
              type: Number,
            },
          },
        ],
        exerciseId: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    dayHistory: [
      {
        monthIndex: {
          type: Number,
        },
        weekIndex: {
          type: Number,
        },
        daySplit: {
          type: Number,
        },
        dayIndex: {
          type: Number,
        },
        state: {
          type: String,
        },
        streak: {
          type: Number,
        },
      },
    ],
    deviceTokens: [String],
    settings: {
      isEnabledNotifications: {
        type: Boolean,
        default: true,
      },
      isEnabledMuteVideo: {
        type: Boolean,
        default: false,
      },
      isEnabledHapicFeedback: {
        type: Boolean,
        default: true,
      },
      isEnabledKeepAwake: {
        type: Boolean,
        default: true,
      },
      isEnabledMetricUnits: {
        type: Boolean,
        default: false,
      },
      weekStartDay: {
        type: String,
        enum: ['monday', 'sunday'],
        default: 'monday'
      },
      isDarkMode: {
        type: Boolean,
        default: false
      },
      language: {
        type: String
      },
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

module.exports = mongoose.model("User", userSchema);
