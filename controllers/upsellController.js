const Upsell = require("../models/upsellModel");
const User = require("../models/userModel");
const UpsellDismiss = require("../models/upsellDismissModel");
const { buildUserCriteriaQuery } = require("../utils/buildUserQuery");
const { parseJSONFields, parseArrayOrObjectField, cleanupImageFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const mongoose = require('mongoose');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');

const createUpsell = async (req, res) => {
  try {
    const data = { ...req.body };

    parseJSONFields(data, ['imageTranslations']);
    parseArrayOrObjectField(data, 'targetCriteria', null);
    parseArrayOrObjectField(data, 'targetUserIds', []);

    if (data.finalPrice !== undefined) {
      data.discountedPrice = parseFloat(data.finalPrice);
      delete data.finalPrice;
    }

    const tempId = new mongoose.Types.ObjectId();

    const imageResults = await processImageFields({
      req,
      collection: 'upsells',
      documentId: tempId.toString(),
      existingDoc: {},
      imageFields: ['image']
    });

    Object.assign(data, imageResults);
    cleanupImageFields(data);

    const upsell = new Upsell({ _id: tempId, ...data });
    await upsell.save();

    res.status(201).json({ success: true, data: upsell });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateUpsell = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    const existingUpsell = await Upsell.findById(id).lean();

    const imageResults = await processImageFields({
      req,
      collection: 'upsells',
      documentId: id,
      existingDoc: existingUpsell,
      imageFields: ['image']
    });

    parseJSONFields(data, ['imageTranslations']);
    parseArrayOrObjectField(data, 'targetCriteria');
    parseArrayOrObjectField(data, 'targetUserIds');

    if (data.originalPrice) data.originalPrice = parseFloat(data.originalPrice);
    if (data.discountValue) data.discountValue = parseFloat(data.discountValue);
    if (data.finalPrice !== undefined) {
      data.discountedPrice = parseFloat(data.finalPrice);
      delete data.finalPrice;
    }
    if (data.durationDays) data.durationDays = parseInt(data.durationDays);
    if (data.durationHours) data.durationHours = parseInt(data.durationHours);
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;

    Object.assign(data, imageResults);
    cleanupImageFields(data);

    const upsell = await Upsell.findByIdAndUpdate(id, data, { new: true });
    res.status(200).json({ success: true, data: upsell });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllUpsells = async (req, res) => {
  try {
    const upsells = await Upsell.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: upsells.length,
      data: upsells,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUpsellById = async (req, res) => {
  try {
    const upsell = await Upsell.findById(req.params.id);
    if (!upsell) {
      return res.status(404).json({ success: false, message: "Upsell not found" });
    }
    res.status(200).json({ success: true, data: upsell });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActiveUpsells = async (req, res) => {
  try {
    const now = new Date();

    const upsells = await Upsell.find({
      isActive: true,
      $or: [
        { timeType: "always" },
        {
          timeType: "date_range",
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        { timeType: "duration" },
      ],
    }).sort({ createdAt: -1 });

    const filteredUpsells = upsells.filter((upsell) => {
      if (upsell.timeType === "duration") {
        const createdAt = new Date(upsell.createdAt);
        const multiplier = upsell.durationType === "days" ? 86400000 : 3600000;
        const expiresAt = new Date(createdAt.getTime() + upsell.duration * multiplier);
        return now <= expiresAt;
      }
      return true;
    });

    res.status(200).json({
      success: true,
      count: filteredUpsells.length,
      data: filteredUpsells,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUpsell = async (req, res) => {
  try {
    const upsell = await Upsell.findById(req.params.id);
    if (!upsell) {
      return res.status(404).json({ success: false, message: "Upsell not found" });
    }

    const context = {
      collection: 'upsells',
      documentId: req.params.id
    };

    if (upsell.image) {
      await deleteImageWithRegistry(upsell.image, {
        ...context,
        fieldPath: 'image'
      });
    }

    if (upsell.imageTranslations) {
      const translations = upsell.imageTranslations instanceof Map 
        ? Object.fromEntries(upsell.imageTranslations) 
        : upsell.imageTranslations;
      
      for (const [lang, imageUrl] of Object.entries(translations)) {
        if (imageUrl && typeof imageUrl === 'string') {
          await deleteImageWithRegistry(imageUrl, {
            ...context,
            fieldPath: `imageTranslations.${lang}`
          });
        }
      }
    }

    await UpsellDismiss.deleteMany({ upsellId: req.params.id });
    await Upsell.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: "Upsell deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const countUsersByCriteria = async (req, res) => {
  try {
    const { criteria, targetType } = req.body;

    let count = 0;
    if (targetType === 'all') {
      count = await User.countDocuments({});
    } else if (targetType === 'criteria' && criteria) {
      const query = buildUserCriteriaQuery(criteria);
      count = await User.countDocuments(query);
    }

    res.status(200).json({
      data: {
        success: true,
        count,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUpsellsForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dismissedUpsells = await UpsellDismiss.find({ userId }).lean();

    const permanentlyDismissedIds = dismissedUpsells
      .filter((d) => d.dismissType === "never")
      .map((d) => d.upsellId.toString());

    const tempDismissedIds = dismissedUpsells
      .filter((d) => d.dismissType === "days_30" && d.dismissedAt > thirtyDaysAgo)
      .map((d) => d.upsellId.toString());

    const excludedIds = [...permanentlyDismissedIds, ...tempDismissedIds];

    const activeUpsells = await Upsell.find({
      isActive: true,
      _id: { $nin: excludedIds },
      $or: [
        { timeType: "always" },
        {
          timeType: "date_range",
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        { timeType: "duration" },
      ],
    }).lean();

    const matchingUpsells = activeUpsells.filter((upsell) => {
      if (upsell.timeType === "duration") {
        const createdAt = new Date(upsell.createdAt);
        const durationMs =
          upsell.durationDays * 24 * 60 * 60 * 1000 +
          upsell.durationHours * 60 * 60 * 1000;
        const expiresAt = new Date(createdAt.getTime() + durationMs);
        if (now > expiresAt) {
          return false;
        }
      }

      if (upsell.targetType === "all") {
        return true;
      }

      if (upsell.targetType === "criteria") {
        return userMatchesCriteria(user, upsell.targetCriteria);
      }

      if (upsell.targetType === "specific") {
        return upsell.targetUserIds?.includes(userId.toString());
      }

      return false;
    });

    res.status(200).json({
      success: true,
      count: matchingUpsells.length,
      data: matchingUpsells,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const userMatchesCriteria = (user, criteria) => {
  if (!criteria) {
    return true;
  }
  if (criteria.subscriptionStatus && criteria.subscriptionStatus !== "all") {
    if (criteria.subscriptionStatus === "subscribed_user") {
      if (user.subscription?.user_subscription_status !== "subscribed_user") {
        return false;
      }
    } else if (criteria.subscriptionStatus === "free") {
      const status = user.subscription?.user_subscription_status;
      if (status && status !== "free" && status !== "free_user") {
        return false;
      }
    }
  }

  if (criteria.subscriptionType?.length > 0) {
    if (!criteria.subscriptionType.includes(user.subscription?.subscription_type)) {
      return false;
    }
  }

  if (criteria.subscriptionSource?.length > 0) {
    if (!criteria.subscriptionSource.includes(user.subscription?.update_source)) {
      return false;
    }
  }

  if (criteria.signupSource && criteria.signupSource !== "all") {
    if (criteria.signupSource === "mobile") {
      if (user.singuptype !== "mobile") {
        return false;
      }
    } else if (criteria.signupSource === "wordpress") {
      if (user.singuptype === "mobile") {
        return false;
      }
    }
  }
  return true;
};

const dismissUpsell = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const upsell = await Upsell.findById(id);
    if (!upsell) {
      return res.status(404).json({ success: false, message: "Upsell not found" });
    }

    await UpsellDismiss.findOneAndUpdate(
      { userId, upsellId:id },
      {
        userId,
        upsellId:id,
        dismissType: upsell.dismissBehavior,
        dismissedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Upsell dismissed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const getDismissCount = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await UpsellDismiss.countDocuments({ upsellId: id });
    res.status(200).json({data:{ success: true, count }});
  } catch (error) {
    res.status(500).json({data:{ success: false, message: error.message }});
  }
};
module.exports = {
  createUpsell,
  getAllUpsells,
  getUpsellById,
  getActiveUpsells,
  updateUpsell,
  deleteUpsell,
  countUsersByCriteria,
  getUpsellsForUser,
  dismissUpsell,
  getDismissCount
};