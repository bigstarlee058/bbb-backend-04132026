const asyncHandler = require("express-async-handler");
const Screen = require("../models/screenModel");
const { processImageFields } = require('../utils/files/google/imageProcessor'); 

const getScreens = asyncHandler(async (req, res) => {
  try {
    const screen = await Screen.findOne({}).lean();
    res.status(200).json(screen || {});
  } catch (e) {
    console.log(e);
    res.status(500).json({});
  }
});

const updateScreens = asyncHandler(async (req, res) => {

  try {
    let existingDoc = await Screen.findOne({});
    
    if (!existingDoc) {
      existingDoc = await Screen.create({});
    }

    const imageFields = [
      "imageLogin",
      "imageSignup",
      "imageForgot",
      "imageEmailConfirm",
      "imageDashboard",
      "imageStreakCalendar",
      "imageMonthView",
      "imageToday",
      "imageTools",
      "imageExerciseLibrary",
      "imageGraphs",
      "imageAchievement",
      "imageApparel",
      "imageFAQs",
      "imageTutorial",
      "imageSubscription",
      "imageProfile",
      "imageMyProfle",
      "imageSetting",
    ];
    const processedImages = await processImageFields({
      req,
      collection: 'screens',
      documentId: existingDoc._id,
      existingDoc: existingDoc.toObject(),
      imageFields
    });

    const { vimeoId, vimeoIdTranslations, slides } = req.body;

    const updateData = {
      vimeoId,
      vimeoIdTranslations: typeof vimeoIdTranslations === 'string' 
        ? JSON.parse(vimeoIdTranslations) 
        : (vimeoIdTranslations || {}),
      slides: typeof slides === 'string' 
        ? JSON.parse(slides) 
        : (slides || []),
      ...processedImages,
    };

    const updatedDoc = await Screen.findByIdAndUpdate(
      existingDoc._id, 
      updateData, 
      { new: true }
    ).lean();

    res.status(200).json({ result: true, data: updatedDoc || {} });
  } catch (e) {
    console.log(e);
    res.status(500).json({ result: false });
  }
});

module.exports = {
  getScreens,
  updateScreens,
};
