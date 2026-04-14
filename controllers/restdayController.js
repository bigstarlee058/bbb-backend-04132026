const asyncHandler = require("express-async-handler");
const { getSortInfo } = require("../utils/utils");
const Restday = require("../models/restdayModel");
const { parseJSONFields } = require('../utils/requestHelpers');
const getRestdaysAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const matchStage = search
      ? {
        $match: {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      }
      : { $match: {} };

    const defaultSort = { $sort: { createdAt: -1 } };
    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : defaultSort;

    const skip = (page - 1) * perPage;

    const pipeline = [
      matchStage,
      {
        $facet: {
          restdays: [
            sortStage,
            { $skip: skip },
            { $limit: perPage },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Restday.aggregate(pipeline).exec();

    const restdays = result?.restdays || [];
    const count = result?.totalCount[0]?.count || 0;

    res.status(200).json({ count, restdays });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getRestdayAdmin = asyncHandler(async (req, res) => {
  try {
    const restday = await Restday.findOne({ _id: req.params.id }).lean();
    res.status(200).json(restday || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const addRestdayAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const equipments = Array.isArray(data.equipments)
      ? data.equipments
      : JSON.parse(data.equipments || "[]");
      
    const restday = await Restday.create({
      title: data.title,
      vimeoId: data.vimeoId,
      description: data.description,
      equipments,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoIdTranslations: data.vimeoIdTranslations || {},
    });
    res.status(200).json({ result: !!restday });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateRestdayAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const existingRestday = await Restday.findById(data._id).lean();
    if (!existingRestday) {
      return res.status(404).json({ result: false, message: 'Restday not found' });
    }

    const equipments = Array.isArray(data.equipments)
      ? data.equipments
      : JSON.parse(data.equipments || "[]");
    const updateData = {
      title: data.title,
      vimeoId: data.vimeoId,
      description: data.description,
      equipments,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoIdTranslations: data.vimeoIdTranslations || {},
    };

    const result = await Restday.findOneAndUpdate(
      { _id: data._id },
      updateData,
      { new: true, lean: true }
    );

    return res.status(200).json({ result: !!result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ result: false, message: error.message });
  }
});

const deleteRestdayAdmin = asyncHandler(async (req, res) => {
  try {
    const deleted = await Restday.findOneAndDelete({
      _id: req.params.id,
    }).lean();
    res.status(200).json({ result: !!deleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getRestdaysTitleAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredRestdays = await Restday.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1 }
    )
    res.status(200).json(filteredRestdays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  addRestdayAdmin,
  updateRestdayAdmin,
  deleteRestdayAdmin,
  getRestdaysAdmin,
  getRestdayAdmin,
  getRestdaysTitleAdmin,
};
