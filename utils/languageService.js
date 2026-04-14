const Tools = require("../models/ToolsModel");
const Upsell = require('../models/upsellModel');
const Screen = require("../models/screenModel");
const Version = require("../models/versionModel");
const Popupworkout = require("../models/popupworkoutModel");
const Popupequipment = require("../models/popupequipmentModel");
const PopupNewJoin = require("../models/popupNewJoinModel");
const Tutorial = require('../models/tutorialModel');
const Exercise = require('../models/exerciseModel');
const Category = require('../models/categoryModel');
const Tag = require('../models/TagsModel');
const Month = require('../models/workoutModel');
const PumpDay = require("../models/pumpDayModel");
const Warmup = require("../models/warmupModel");
const Equipment = require("../models/equipmentModel");
const AchievementsGroup = require("../models/achievementsgroupModel");
const User = require("../models/userModel");
const AchievementsIndividual = require("../models/achievementsindividualModel");
const AchievementsTarget = require("../models/achievementstargetModel");
const Collection = require("../models/collectionModel");
const PhasesMainInfo = require("../models/phasesmaininfoModel");
const Phases = require("../models/phasesModel");
const Section = require("../models/programInfoModel");
const Staff = require("../models/staffModel");
const Challenge = require("../models/challengeModel");
const Faqs = require("../models/faqsModel");
const Bonus = require("../models/bonusModel");
const Download = require("../models/downloadModel");
const MODELS_WITH_TRANSLATIONS = [
  Tools, Upsell, Screen, Version,
  Popupworkout, Popupequipment, PopupNewJoin,
  Tutorial, Exercise, Category, Tag,
  Month, PumpDay, Warmup, Equipment,
  AchievementsGroup, AchievementsIndividual, AchievementsTarget, Collection,
  PhasesMainInfo, Phases, Section, Staff,
  Challenge, Faqs, Bonus, Download
];

class LanguageService {

  getKeys(obj) {
    if (obj._doc) {
      return Object.keys(obj._doc);
    }
    return Object.keys(obj);
  }

  updateTranslationsInObject(obj, oldKey, newKey) {
    let hasChanges = false;

    if (!obj || typeof obj !== 'object') {
      return false;
    }

    if (obj instanceof Map) {
      if (obj.has(oldKey)) {
        const value = obj.get(oldKey);
        obj.set(newKey, value);
        obj.delete(oldKey);
        hasChanges = true;
      }
      return hasChanges;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (this.updateTranslationsInObject(item, oldKey, newKey)) {
          hasChanges = true;
        }
      }
      return hasChanges;
    }

    const keys = this.getKeys(obj);

    for (const key of keys) {
      const value = obj[key];

      if (key.endsWith('Translations') && value instanceof Map) {
        if (value.has(oldKey)) {
          const translationValue = value.get(oldKey);
          value.set(newKey, translationValue);
          value.delete(oldKey);
          hasChanges = true;
        }
      } else if (value && typeof value === 'object') {
        if (this.updateTranslationsInObject(value, oldKey, newKey)) {
          hasChanges = true;
        }
      }
    }

    return hasChanges;
  }

  deleteTranslationsInObject(obj, key) {
    let hasChanges = false;

    if (!obj || typeof obj !== 'object') {
      return false;
    }

    if (obj instanceof Map) {
      if (obj.has(key)) {
        obj.delete(key);
        hasChanges = true;
      }
      return hasChanges;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (this.deleteTranslationsInObject(item, key)) {
          hasChanges = true;
        }
      }
      return hasChanges;
    }

    const keys = this.getKeys(obj);

    for (const propName of keys) {
      const value = obj[propName];

      if (propName.endsWith('Translations') && value instanceof Map) {
        if (value.has(key)) {
          value.delete(key);
          hasChanges = true;
        }
      } else if (value && typeof value === 'object') {
        if (this.deleteTranslationsInObject(value, key)) {
          hasChanges = true;
        }
      }
    }

    return hasChanges;
  }

  async updateUserLanguagePreference(oldKey, newKey) {
    try {
      const result = await User.updateMany(
        { 'settings.language': oldKey },
        { $set: { 'settings.language': newKey } }
      );
      return {
        model: 'User',
        success: true,
        updated: result.modifiedCount,
        matched: result.matchedCount
      };
    } catch (error) {
      console.error('Failed to update user language preferences:', error);
      return {
        model: 'User',
        success: false,
        error: error.message
      };
    }
  }

  async updateLanguageKey(oldKey, newKey, batchSize = 100) {
    const results = [];
    for (const Model of MODELS_WITH_TRANSLATIONS) {
      try {
        let updatedCount = 0;
        let failedCount = 0;

        const totalCount = await Model.countDocuments();
        const cursor = Model.find({}).cursor();
        const batch = [];

        for await (const doc of cursor) {
          try {
            const hasChanges = this.updateTranslationsInObject(doc, oldKey, newKey);

            if (hasChanges) {
              batch.push(doc);
            }

            if (batch.length >= batchSize) {
              await Promise.all(batch.map(d => d.save()));
              updatedCount += batch.length;
              batch.length = 0;
            }
          } catch (error) {
            console.error(`Failed to process document ${doc._id} in ${Model.modelName}:`, error);
            failedCount++;
          }
        }

        if (batch.length > 0) {
          try {
            await Promise.all(batch.map(d => d.save()));
            updatedCount += batch.length;
          } catch (error) {
            console.error(`Failed to save final batch in ${Model.modelName}:`, error);
            failedCount += batch.length;
          }
        }

        results.push({
          model: Model.modelName,
          success: true,
          updated: updatedCount,
          failed: failedCount,
          total: totalCount
        });

      } catch (error) {
        console.error(`Failed to process model ${Model.modelName}:`, error);
        results.push({
          model: Model.modelName,
          success: false,
          error: error.message
        });
      }
    }

    const userResult = await this.updateUserLanguagePreference(oldKey, newKey);
    results.push(userResult);

    return results;
  }

  async deleteLanguageTranslations(key, batchSize = 100) {
    const results = [];
    for (const Model of MODELS_WITH_TRANSLATIONS) {
      try {
        let deletedCount = 0;
        let failedCount = 0;

        const totalCount = await Model.countDocuments();
        const cursor = Model.find({}).cursor();
        const batch = [];

        for await (const doc of cursor) {
          try {
            const hasChanges = this.deleteTranslationsInObject(doc, key);

            if (hasChanges) {
              batch.push(doc);
            }

            if (batch.length >= batchSize) {
              await Promise.all(batch.map(d => d.save()));
              deletedCount += batch.length;
              batch.length = 0;
            }
          } catch (error) {
            console.error(`Failed to process document ${doc._id} in ${Model.modelName}:`, error);
            failedCount++;
          }
        }

        if (batch.length > 0) {
          try {
            await Promise.all(batch.map(d => d.save()));
            deletedCount += batch.length;
          } catch (error) {
            console.error(`Failed to save final batch in ${Model.modelName}:`, error);
            failedCount += batch.length;
          }
        }

        results.push({
          model: Model.modelName,
          success: true,
          deleted: deletedCount,
          failed: failedCount,
          total: totalCount
        });

      } catch (error) {
        console.error(`Failed to process model ${Model.modelName}:`, error);
        results.push({
          model: Model.modelName,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async getAffectedSummary() {
    const summary = [];

    for (const Model of MODELS_WITH_TRANSLATIONS) {
      const count = await Model.countDocuments();
      summary.push({
        model: Model.modelName,
        totalDocuments: count
      });
    }

    const userCount = await User.countDocuments();
    summary.push({
      model: 'User',
      totalDocuments: userCount,
      note: 'settings.language field'
    });

    return summary;
  }

  async getUsersCountByLanguage(key) {
    const count = await User.countDocuments({ 'settings.language': key });
    return count;
  }
}

module.exports = new LanguageService();