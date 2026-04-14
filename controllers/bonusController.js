const asyncHandler = require("express-async-handler");
const Bonus = require("../models/bonusModel");
const Equipment = require("../models/equipmentModel");
const Setting = require("../models/settingModel");
const { getSortInfo } = require("../utils/utils");
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const mongoose = require('mongoose');

const getBonusesAdmin = asyncHandler(async (req, res) => {
  let { page = 1, perPage = 10, search, sortBy } = req.query;
  page = Math.max(1, parseInt(page));
  perPage = Math.max(1, parseInt(perPage));

  try {
    const matchStage = search
      ? {
          $match: {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          },
        }
      : null;

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : null;
    const skipStage = { $skip: (page - 1) * perPage };
    const limitStage = { $limit: perPage };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push({
      $facet: {
        data: [sortStage, skipStage, limitStage].filter(Boolean),
        total: [{ $count: "count" }],
      },
    });

    const [result] = await Bonus.aggregate(pipeline);

    res.status(200).json({
      count: result?.total?.[0]?.count || 0,
      bonuses: result?.data || [],
    });
  } catch (error) {
    console.error("Error fetching bonuses:", error);
    res.status(200).json({ count: 0, bonuses: [], message: error.message });
  }
});

const getBonuses = asyncHandler(async (req, res) => {
  const [bonuses, count] = await Promise.all([
    Bonus.find({}).lean(),
    Bonus.countDocuments(),
  ]);
  res.status(200).json({ count, bonuses });
});

const getFeaturedBonuses = asyncHandler(async (req, res) => {
  const [result] = await Bonus.aggregate([
    { $match: { isFeatured: true } },
    {
      $facet: {
        bonuses: [],
        totalCount: [{ $count: "total" }],
      },
    },
  ]);

  res.status(200).json({
    bonuses: result?.bonuses ?? [],
    count: result?.totalCount?.[0]?.total ?? 0,
  });
});

const getBonusAdmin = asyncHandler(async (req, res) => {
  try {
    const bonusId = req.params.id;

    const [bonus, relatedEquipment] = await Promise.all([
      Bonus.findById(bonusId).lean(),
      Equipment.find({ bonuses: bonusId }).populate("bonuses").lean(),
    ]);

    if (!bonus) {
      return res
        .status(200)
        .json({ result: false, message: "Bonus not found" });
    }

    res.status(200).json({ ...bonus, relatedEquipment });
  } catch (error) {
    console.error("Error fetching bonus:", error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const getBonusTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredBonuses = await Bonus.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    ).lean();

    res.status(200).json(filteredBonuses);
  } catch (error) {
    console.error("Error fetching bonus titles:", error);
    res.status(200).json([]);
  }
});

const addBonusAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };

    const parseJSONField = (field) => {
      if (!data[field]) return {};
      if (typeof data[field] === 'object') return data[field];
      try {
        return JSON.parse(data[field]);
      } catch {
        return {};
      }
    };

    const newId = new mongoose.Types.ObjectId();

    const imageResults = await processImageFields({
      req,
      collection: 'bonuses',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail']
    });

    const bonusData = {
      _id: newId,
      title: data.title,
      titleTranslations: parseJSONField('titleTranslations'),
      description: data.description,
      descriptionTranslations: parseJSONField('descriptionTranslations'),
      thumbnail: imageResults.thumbnail || '',
      isFeatured: data.isFeatured === "true" || data.isFeatured === true,
    };

    const bonus = await Bonus.create(bonusData);

    if (bonus) {
      Setting.updateOne({}, { bonusCheckpoint: new Date() }).catch((err) =>
        console.error("Failed to update bonus checkpoint:", err)
      );
      return res.status(200).json({ result: true, bonus });
    }

    res.status(200).json({ result: false });
  } catch (error) {
    console.error("Error adding bonus:", error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const updateBonusAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;

    const parseJSONField = (field) => {
      if (!data[field]) return {};
      if (typeof data[field] === 'object') return data[field];
      try {
        return JSON.parse(data[field]);
      } catch {
        return {};
      }
    };

    const existingBonus = await Bonus.findById(_id).lean();
    if (!existingBonus) {
      return res.status(404).json({ result: false, message: 'Bonus not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'bonuses',
      documentId: _id,
      existingDoc: existingBonus,
      imageFields: ['thumbnail']
    });

    const bonusData = {
      title: data.title,
      titleTranslations: parseJSONField('titleTranslations'),
      description: data.description,
      descriptionTranslations: parseJSONField('descriptionTranslations'),
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingBonus.thumbnail,
      isFeatured: data.isFeatured === "true" || data.isFeatured === true,
    };

    const bonus = await Bonus.findByIdAndUpdate(_id, bonusData, { new: true });

    Setting.updateOne({}, { bonusCheckpoint: new Date() }).catch((err) =>
      console.error("Failed to update bonus checkpoint:", err)
    );

    res.status(200).json({ result: true, bonus, id: bonus?._id });
  } catch (error) {
    console.error("Error updating bonus:", error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const deleteBonusAdmin = asyncHandler(async (req, res) => {
  try {
    const bonus = await Bonus.findById(req.params.id);
    if (!bonus) {
      return res.status(404).json({ result: false, message: "Bonus not found" });
    }

    const context = {
      collection: 'bonuses',
      documentId: req.params.id
    };

    if (bonus.thumbnail) {
      await deleteImageWithRegistry(bonus.thumbnail, {
        ...context,
        fieldPath: 'thumbnail'
      });
    }

    await Bonus.findByIdAndDelete(req.params.id);

    Setting.updateOne({}, { bonusCheckpoint: new Date() }).catch((err) =>
      console.error("Failed to update bonus checkpoint:", err)
    );

    res.status(200).json({ result: true, message: "Bonus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bonus:", error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const toggleBonusFeatured = asyncHandler(async (req, res) => {
  try {
    const { bonusId, isFeatured } = req.body;

    const result = await Bonus.findByIdAndUpdate(
      bonusId,
      { $set: { isFeatured } },
      { new: true }
    );

    Setting.updateOne({}, { bonusCheckpoint: new Date() }).catch((err) =>
      console.error("Failed to update bonus checkpoint:", err)
    );

    res.status(200).json({ result: !!result, message: isFeatured ? "Bonus featured" : "Bonus unfeatured" });
  } catch (error) {
    console.error("Error toggling bonus featured:", error);
    res.status(200).json({ result: false });
  }
});

module.exports = {
  addBonusAdmin,
  updateBonusAdmin,
  deleteBonusAdmin,
  getBonusesAdmin,
  getBonuses,
  getFeaturedBonuses,
  getBonusAdmin,
  getBonusTitlesAdmin,
  toggleBonusFeatured,
};