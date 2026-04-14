const asyncHandler = require("express-async-handler");
const Staff = require("../models/staffModel");
const { sendEmail } = require("../utils/emails/init");
const { getSortInfo } = require("../utils/utils");
const mongoose = require('mongoose');
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getStaffsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy = "NewestAdded" } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const matchStage = search
      ? { $match: { title: { $regex: search, $options: "i" } } }
      : null;

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : null;

    const skipStage = { $skip: (page - 1) * perPage };
    const limitStage = { $limit: perPage };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);

    pipeline.push({
      $facet: {
        staffs: [...(sortStage ? [sortStage] : []), skipStage, limitStage],
        totalCount: [{ $count: "count" }],
      },
    });

    const [result] = await Staff.aggregate(pipeline).exec();

    const staffs = result?.staffs || [];
    const count = result?.totalCount[0]?.count || 0;

    res.status(200).json({ count, staffs });
  } catch (error) {
    res.status(500).json({ count: 0, staffs: [], error: "Server error" });
  }
});

const getStaffs = asyncHandler(async (req, res) => {
  try {
    const staffs = await Staff.find().lean();
    res.status(200).json(staffs);
  } catch (error) {
    res.status(500).json({ staffs: [], error: error.message });
  }
});

const getStaffAdmin = asyncHandler(async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id }).lean();
    res.status(200).json(staff || {});
  } catch (error) {
    res.status(500).json({ staff: null, error: error.message });
  }
});

const getStaffTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredStaffs = await Staff.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    ).lean();
    res.status(200).json(filteredStaffs);
  } catch (error) {
    res.status(500).json({ filteredStaffs: [], error: error.message });
  }
});

const addStaffAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const newId = new mongoose.Types.ObjectId();
    const imageResults = await processImageFields({
      req,
      collection: 'staffs',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['photo']
    });

    const documentToInsert = {
      _id: newId,
      title: data.title,
      location: data.location,
      type: data.type,
      bio: data.bio,
      bioTranslations: data.bioTranslations || {},
      link: data.link,
      linkedin: data.linkedin,
      tiktok: data.tiktok,
      facebook: data.facebook,
      twitter: data.twitter,
      photo: imageResults.photo || '',
    };

    const staff = await Staff.create(documentToInsert);
    res.status(200).json({ result: !!staff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateStaffAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    parseJSONFields(data);

    const existingStaff = await Staff.findById(_id).lean();
    if (!existingStaff) {
      return res.status(404).json({ result: false, message: 'Staff not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'staffs',
      documentId: _id,
      existingDoc: { image: existingStaff.photo },
      imageFields: ['photo']
    });

    const updateData = {
      title: data.title,
      location: data.location,
      type: data.type,
      bio: data.bio,
      bioTranslations: data.bioTranslations || existingStaff.bioTranslations || {},
      link: data.link,
      linkedin: data.linkedin,
      tiktok: data.tiktok,
      facebook: data.facebook,
      twitter: data.twitter,
      photo: imageResults.photo !== undefined ? imageResults.photo : existingStaff.photo,
    };

    const result = await Staff.findByIdAndUpdate(_id, updateData, {
      new: true,
      lean: true,
    });

    res.status(200).json({ result: !!result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteStaffAdmin = asyncHandler(async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ result: false, message: "Staff not found" });
    }

    const context = {
      collection: 'staffs',
      documentId: req.params.id
    };

    if (staff.photo) {
      await deleteImageWithRegistry(staff.photo, {
        ...context,
        fieldPath: 'photo'
      });
    }

    await Staff.findByIdAndDelete(req.params.id);
    res.status(200).json({ result: true, message: "Staff deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const addOwnSpotsligths = asyncHandler(async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = req.user;

    let imageBase64 = "";
    let imageType = "image/jpeg";

    if (req.files?.[0]?.buffer) {
      imageBase64 = req.files[0].buffer.toString("base64");
      imageType = req.files[0].mimetype || "image/jpeg";
    }


    const msg = {
      from: "notifications@ptfinalexam.com",
      to: "nick@perceptively.com",
      subject: "New Spotlight Submission",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <p><strong>${title}</strong></p>
          <p>${description}</p>
          <p>${user.email}</p>
          <p>${user.name}</p>
        </div>
      `,
      attachments: imageBase64
        ? [
          {
            content: imageBase64,
            filename: "spotlight.jpg",
            type: imageType,
            disposition: "attachment",
          },
        ]
        : [],
    };

    // const msg = {
    //   from: "notifications@ptfinalexam.com",
    //   to: "nick@perceptively.com",
    //   subject: "New Spotlight Submission",
    //   html: `
    //     <div style="font-family: Arial, sans-serif;">
    //       ${
    //         imageBase64
    //           ? `<img src="cid:${cid}" alt="Image" style="max-width:100%; height:auto; margin-bottom:16px;" />`
    //           : ""
    //       }
    //       <p><strong>${title}</strong></p>
    //       <p>${description}</p>
    //       <p>${user.email}</p>
    //       <p>${user.name}</p>
    //     </div>
    //   `,
    //   attachments: imageBase64
    //     ? [
    //         {
    //           content: imageBase64,
    //           filename: "spotlight.jpg",
    //           type: imageType,
    //           disposition: "inline",
    //           content_id: cid,
    //         },
    //       ]
    //     : [],
    // };

    try {
      sendEmail(msg);
      res.status(200).json({ result: true });
    } catch {
      res.status(200).json({ result: false });
    }
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getStaffsAdmin,
  getStaffs,
  addStaffAdmin,
  updateStaffAdmin,
  deleteStaffAdmin,
  getStaffAdmin,
  getStaffTitlesAdmin,
  addOwnSpotsligths,
};
