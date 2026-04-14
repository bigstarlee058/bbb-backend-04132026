const mongoose = require("mongoose");

const upsellSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    subtitleTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    descriptionTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    imageTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountedPrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    buttonText: {
      type: String,
      required: true,
      trim: true,
    },
    buttonTextTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    buttonLink: {
      type: String,
      required: true,
      trim: true,
    },
    buttonLinkTranslations: {
      type: Map,
      of: String,
      default: {},
    },
    timeType: {
      type: String,
      enum: ["always", "date_range", "duration"],
      default: "always",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    durationDays: {
      type: Number,
      default: 0,
    },
    durationHours: {
      type: Number,
      default: 0,
    },
    targetType: {
      type: String,
      enum: ["all", "criteria"],
      default: "all",
    },
    dismissBehavior: {
      type: String,
      enum: ["session", "days_30", "never"],
      default: "session",
    },
    targetCriteria: {
      subscriptionStatus: {
        type: String,
        enum: ['all', 'subscribed_user', 'free'],
        default: 'all',
      },
      subscriptionType: {
        type: [String],
        enum: ['trial', 'weekly', 'monthly', 'quarterly', 'yearly'],
        default: [],
      },
      subscriptionSource: {
        type: [String],
        enum: ['wp', 'rc', 'admin'],
        default: [],
      },
      signupSource: {
        type: String,
        enum: ['all', 'wordpress', 'mobile'],
        default: 'all',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Upsell", upsellSchema);