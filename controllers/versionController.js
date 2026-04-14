const Version = require("../models/versionModel");

const getVersion = async (_, res) => {
  try {
    const version = await Version.findOne({}).lean();
    if (version) {
      res.status(200).json(version);
    } else {
      res.status(200).json({
        android: { version: "1.0", forceUpdate: false },
        ios: { version: "1.0", forceUpdate: false },
        update_title: "",
        update_message: "",
      });
    }
  } catch (e) {
    res.status(200).json({
      android: {
        version: '1.0',
        forceUpdate: false,
        showPopUp:false
      },
      ios: {
        version: '1.0',
        forceUpdate: false,
        showPopUp:false
      },
      update_title: '',
      update_message: ''
    });
  }
};

const updateVersion = async (req, res) => {
  try {
    const { 
      androidVersion, 
      androidForceUpdate,
      iosVersion, 
      iosForceUpdate, 
      update_title, 
      description,
      update_messageTranslations,
      update_titleTranslations,
      version,
      androidShowPopUp,
      iosShowPopUp,
    } = req.body;

    const updateData = {};

    // Handle new Android and iOS fields
    if (androidVersion !== undefined) {
      updateData['android.version'] = androidVersion;
    }
    if (androidForceUpdate !== undefined) {
      updateData['android.forceUpdate'] = androidForceUpdate;
    }
    if (iosVersion !== undefined) {
      updateData['ios.version'] = iosVersion;
    }
    if (iosForceUpdate !== undefined) {
      updateData['ios.forceUpdate'] = iosForceUpdate;
    }
    if (iosShowPopUp !== undefined) {
      updateData['ios.showPopUp'] = iosShowPopUp;
    }
    if (androidShowPopUp !== undefined) {
      updateData['android.showPopUp'] = androidShowPopUp;
    }
    if (update_title !== undefined) {
      updateData.update_title = update_title;
    }
    if (description !== undefined) {
      updateData.update_message = description;
    }
    if (version !== undefined) {
      updateData.latest_version = version;
    }
    if (update_titleTranslations !== undefined) {
      updateData.update_titleTranslations = update_titleTranslations;
    }
    if (update_messageTranslations !== undefined) {
      updateData.update_messageTranslations = update_messageTranslations;
    }

    await Version.findOneAndUpdate(
      {},
      updateData,
      { upsert: true, new: true }
    )
      .then((doc) => {
        res.status(200).json({ result: true,data:doc });
      })
      .catch((error) => {
        res.status(200).json({ result: false, message: error });
      });
  } catch (e) {
    res.status(200).json({ result: false, message: e.message || e });
  }
};

module.exports = {
  getVersion,
  updateVersion,
};
