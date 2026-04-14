const asyncHandler = require("express-async-handler");
const Setting = require("../models/settingModel");
const { uploadImage } = require("../utils/files/google/gcs");
const languageService = require('../utils/languageService');
const { renameLanguageKeyInRegistry } = require('../utils/languageHelpers');

const getSettingAdmin = asyncHandler(async (_req, res) => {
  try {
    const settings = await Setting.find().lean();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateMonthCoverAdmin = asyncHandler(async (req, res) => {
  try {
    let monthCover;
    if (req.files?.[0]?.buffer) {
      monthCover = await uploadImage(req.files[0].buffer);
    }

    let setting = await Setting.findOne().lean();

    if (setting) {
      await Setting.updateOne(
        { _id: setting._id },
        { $set: { monthCover: monthCover || setting.monthCover } }
      );
    } else {
      await Setting.create({ monthCover });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});
const getAvilableLanguages = asyncHandler(async (_req, res) => {
  try {
    const setting = await Setting.findOne();

    if (!setting) {
      return res.status(500).json({
        result: true,
        languages: []
      });
    }

    res.status(200).json({
      data: {
        result: true,
        languages: setting?.languages?.filter(l => l?.inUse) || []
      }
    });

  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});
const getAllLanguages = asyncHandler(async (_req, res) => {
  try {
    const setting = await Setting.findOne();

    if (!setting) {
      return res.status(500).json({
        result: true,
        languages: []
      });
    }
    res.status(200).json({
      data: {
        result: true,
        languages: setting?.languages || []
      }
    });

  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

const createLanguage = asyncHandler(async (req, res) => {
  try {
    const { key, name ,inUse} = req.body;

    if (!key || !name) {
      return res.status(400).json({
        result: false,
        message: "Language key and name are required"
      });
    }

    const setting = await Setting.findOne();

    if (!setting) {
      return res.status(404).json({
        result: false,
        message: "Settings not found. Please create settings first."
      });
    }
    const exists = setting.languages.some(lang => lang.key === key);
    if (exists) {
      return res.status(400).json({
        result: false,
        message: `Language with key '${key}' already exists`
      });
    }

    setting.languages.push({ key, name ,inUse});
    const savedSetting = await setting.save();

    const newLanguage = savedSetting.languages[savedSetting.languages.length - 1];

    res.status(201).json({
      data: {
        result: true,
        message: `Language '${name}' created successfully`,
        language: newLanguage
      }
    });
  } catch (error) {
    console.error('Create Language Error:', error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateLanguage = asyncHandler(async (req, res) => {
  const { langId } = req.params;
  const { key, name, inUse } = req.body;

  const setting = await Setting.findOne();

  if (!setting) {
    return res.status(404).json({ result: false, message: "Settings not found" });
  }

  const language = setting.languages.id(langId);
  if (!language) {
    return res.status(404).json({ result: false, message: "Language not found" });
  }

  const oldKey = language.key;
  let keyChanged = false;

  if (key !== undefined && key !== language.key) {
    const trimmedKey = key.trim().toLowerCase();

    if (trimmedKey === 'en') {
      return res.status(400).json({ result: false, message: "Cannot rename a language to 'en'." });
    }

    const exists = setting.languages.some(
      lang => lang._id.toString() !== langId && lang.key === trimmedKey
    );

    if (exists) {
      return res.status(400).json({ result: false, message: `Language '${trimmedKey}' already exists` });
    }

    language.key = trimmedKey;
    keyChanged = true;
  }

  if (name !== undefined) language.name = name;
  if (inUse !== undefined) language.inUse = inUse;
  
  await setting.save();

  let translationResults = null;

  if (keyChanged) {
    try {
      console.log(`Renaming registry keys from ${oldKey} to ${language.key}...`);
      await renameLanguageKeyInRegistry(oldKey, language.key);
      translationResults = await languageService.updateLanguageKey(oldKey, language.key);
      
    } catch (error) {
      console.error(' Error updating translations/registry:', error);
    }
  }

  res.status(200).json({
    data: {
      result: true,
      message: "Language updated successfully",
      language,
      ...(translationResults && { translationResults })
    }
  });
});
const deleteLanguage = asyncHandler(async (req, res) => {
  try {
    const { langId } = req.params;

    const setting = await Setting.findOne();

    if (!setting) {
      return res.status(404).json({
        result: false,
        message: "Settings not found"
      });
    }

    const language = setting.languages.id(langId);
    const languageKey = language.key;
    if (!language) {
      return res.status(404).json({
        result: false,
        message: "Language not found"
      });
    }

    language.deleteOne();
    await setting.save();
    let translationResults = null;
    try {
      translationResults = await languageService.deleteLanguageTranslations(languageKey);
    } catch (error) {
      console.error('Error deleting translations:', error);
    }
    res.status(200).json({
      data: {
        result: true,
        message: "Language deleted successfully",
        ...(translationResults && { translationResults })
      }
    });
  } catch (error) {
    console.error('Delete Language Error:', error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getSettingAdmin,
  updateMonthCoverAdmin,
  getAllLanguages,
  getAvilableLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
};
