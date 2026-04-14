const asyncHandler = require("express-async-handler");
const PopupNewJoin = require("../models/popupNewJoinModel");
const { processImageFields } = require('../utils/files/google/imageProcessor');
const mongoose = require('mongoose');
const { parseJSONFields, cleanupImageFields } = require('../utils/requestHelpers');
const getPopupNewJoin = asyncHandler(async (_, res) => {
  try {
    const popup = await PopupNewJoin.findOne({}).lean();

    if (!popup) {
      return res.status(200).json({
        imgUrl: "",
        imgUrlTranslations: {},
        title: "",
        titleTranslations: {},
        description: "",
        descriptionTranslations: {},
        buttonText: "",
        buttonTextTranslations: {},
      });
    }

    res.status(200).json(popup);
  } catch (error) {
    console.error("Error fetching popup:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updatePopupNewJoin = async (req, res) => {
  try {
    const data = { ...req.body };
    const existingDoc = await PopupNewJoin.findOne().lean();
    parseJSONFields(data);
    let popup;
    if (!existingDoc) {
      const newId = new mongoose.Types.ObjectId();
      const initialData = {
        _id: newId,
        title: data.title || '',
        titleTranslations: data.titleTranslations || {},
        description: data.description || '',
        descriptionTranslations: data.descriptionTranslations || {},
        buttonText: data.buttonText || '',
        buttonTextTranslations: data.buttonTextTranslations || {},
      };
      popup = await PopupNewJoin.create(initialData);
      const createdDoc = await PopupNewJoin.findById(newId).lean();
      const imageResults = await processImageFields({
        req,
        collection: 'popupnewjoins',
        documentId: newId.toString(),
        existingDoc: createdDoc,
        imageFields: ['imgUrl']
      });
      if (Object.keys(imageResults).length > 0) {
        cleanupImageFields(imageResults);
        popup = await PopupNewJoin.findByIdAndUpdate(
          newId, 
          imageResults, 
          { new: true }
        );
      }
    } else {
      const id = existingDoc._id.toString();
      
      const imageResults = await processImageFields({
        req,
        collection: 'popupnewjoins',
        documentId: id,
        existingDoc,
        imageFields: ['imgUrl']
      });

      if (data.deleteImgUrl !== undefined) {
        data.deleteImgUrl = data.deleteImgUrl === 'true' || data.deleteImgUrl === true;
      }

      Object.assign(data, imageResults);
      cleanupImageFields(data);

      popup = await PopupNewJoin.findByIdAndUpdate(id, data, { new: true });
    }

    res.status(200).json({data:{ success: true, result: true, data: popup }});
  } catch (error) {
    console.error("Error updating popup:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getPopupNewJoin,
  updatePopupNewJoin,
};