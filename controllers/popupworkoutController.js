const asyncHandler = require("express-async-handler");
const Popupworkout = require("../models/popupworkoutModel");
const { uploadImage } = require("../utils/files/google/gcs");
const { getVimeoDetails } = require("../utils/utils");

const getPopupWorkout = asyncHandler(async (req, res) => {
  try {
    const popupworkout = await Popupworkout.findOne({}).lean();

    if (!popupworkout) {
      return res
        .status(200)
        .json({
          vimeoId: "",
          imgUrl: "",
          title: "",
          description: "",
          files: [],
        });
    }

    let files = [];
    try {
      const vimeoDetails = await getVimeoDetails(popupworkout.vimeoId);
      files = vimeoDetails?.files || [];
    } catch (e) {
      console.error(e);
    }

    res.status(200).json({ ...popupworkout, files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updatePopupWorkout = asyncHandler(async (req, res) => {
  try {
    const { vimeoId, title, description, vimeoTranslations, titleTranslations, descriptionTranslations } = req.body;
    const vimeoTrans = vimeoTranslations ? JSON.parse(vimeoTranslations) : {};
    const titleTrans = titleTranslations ? JSON.parse(titleTranslations) : {};
    const descTrans = descriptionTranslations ? JSON.parse(descriptionTranslations) : {};
    const thumbnailPromise = req.files?.[0]?.buffer
      ? uploadImage(req.files[0].buffer)
      : null;
    const thumbnail = thumbnailPromise ? await thumbnailPromise : null;

    const updated = await Popupworkout.findOneAndUpdate(
      {},
      {
        vimeoId, ...(thumbnail && { imgUrl: thumbnail }), title, description,
        vimeoTranslations: vimeoTrans,
        titleTranslations: titleTrans,
        descriptionTranslations: descTrans,
      },
      { upsert: true, new: true }
    ).lean();

    res.status(200).json({ result: !!updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getPopupWorkout,
  updatePopupWorkout,
};
