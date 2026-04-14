const asyncHandler = require("express-async-handler");
const Tags = require("../models/TagsModel");
const Exercise = require("../models/exerciseModel");
const { uploadImage } = require("../utils/files/google/gcs");
const { getSortInfo } = require("../utils/utils");
const { parseJSONFields} = require('../utils/requestHelpers');
const getTagsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const matchStage = search
      ? { $match: { title: { $regex: search, $options: "i" } } }
      : null;

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : null;

    const skip = (page - 1) * perPage;

    const facet = {
      $facet: {
        populatedTags: [
          ...(sortStage ? [sortStage] : []),
          { $skip: skip },
          { $limit: perPage },
        ],
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push(facet);

    const results = await Tags.aggregate(pipeline).exec();

    let tags = results[0]?.populatedTags || [];
    const count = results[0]?.totalCount[0]?.totalMatchingDocuments || 0;

    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        const exerciseCount = await Exercise.countDocuments({
          tags: tag._id.toString(),
        });
        return { ...tag, exerciseCount };
      })
    );

    res.status(200).json({ count, tags: tagsWithCounts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ count: 0, tags: [] });
  }
});

const getTagAdmin = asyncHandler(async (req, res) => {
  try {
    const tag = await Tags.findById(req.params.id).lean();
    res.status(200).json(tag || {});
  } catch (error) {
    console.log(error);
    res.status(500).json({});
  }
});

const getTagTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredTags = await Tags.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    );
    res.status(200).json(filteredTags);
  } catch (error) {
    console.log(error);
    res.status(500).json([]);
  }
});

const addTagAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const tagData = {
      title: data.title,
      titleTranslations: data.titleTranslations || {},
    };
    const tag = await Tags.create(tagData);
    res.status(200).json({ result: !!tag, tag: tag || null });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, tag: null });
  }
});

const updateTagAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    
    parseJSONFields(data);

    const updateData = {
      title: data.title,
      titleTranslations: data.titleTranslations || {},
    };
    const result = await Tags.findByIdAndUpdate(_id, updateData, {
      new: true,
    }).lean();
    res.status(200).json({ result: !!result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false });
  }
});

const deleteTagAdmin = asyncHandler(async (req, res) => {
  try {
    const result = await Tags.findByIdAndDelete(req.params.id).lean();
    res.status(200).json({ result: !!result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false });
  }
});

module.exports = {
  getTagsAdmin,
  addTagAdmin,
  updateTagAdmin,
  deleteTagAdmin,
  getTagAdmin,
  getTagTitlesAdmin,
};
