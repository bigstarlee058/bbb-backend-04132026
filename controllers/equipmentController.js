const asyncHandler = require("express-async-handler");
const Equipment = require("../models/equipmentModel");
const Collection = require("../models/collectionModel");
const Setting = require("../models/settingModel");
const { getSortInfo } = require("../utils/utils");
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const mongoose = require('mongoose');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getEquipmentsAdmin = asyncHandler(async (req, res) => {
  try {
    let {
      page = 1,
      perPage = 10,
      search,
      sortBy,
      filterCollectionString = "",
    } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const filteredCollections = await Collection.find(
      { title: { $regex: filterCollectionString, $options: "i" } },
    ).lean();
    const matchConditions = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [equipments, count] = await Promise.all([
      Equipment.find(matchConditions)
        .sort(sortBy ? getSortInfo(sortBy) : {})
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
      Equipment.countDocuments(matchConditions),
    ]);

    res
      .status(200)
      .json({ count, equipments, collections: filteredCollections });
  } catch {
    res.status(200).json({ count: 0, equipments: [], collections: [] });
  }
});

const getEquipments = asyncHandler(async (req, res) => {
  try {
    const filterCollectionString = req.query.filterCollectionString || "";

    const [filteredCollections, equipments] = await Promise.all([
      Collection.find({ title: { $regex: filterCollectionString, $options: "i" } }, { title: 1, _id: 1 }).lean(),
      Equipment.find().lean(),
    ]);

    res.status(200).json({
      count: equipments.length,
      equipments,
      collections: filteredCollections,
    });
  } catch {
    res.status(200).json({ count: 0, equipments: [], collections: [] });
  }
});

const getEquipmentAdmin = asyncHandler(async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id).populate("collections").lean();
    res.status(200).json(equipment || {});
  } catch {
    res.status(200).json({});
  }
});

const getEquipmentTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredEquipments = await Equipment.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    );
    res.status(200).json(filteredEquipments);
  } catch {
    res.status(200).json([]);
  }
});

const addEquipmentAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    
    parseJSONFields(data);

    const parseArray = (field) => {
      if (!data[field]) return [];
      if (Array.isArray(data[field])) return data[field];
      try {
        return JSON.parse(data[field]);
      } catch {
        return [];
      }
    };

    const newId = new mongoose.Types.ObjectId();
    const imageResults = await processImageFields({
      req,
      collection: 'equipments',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail']
    });

    const equipmentData = {
      _id: newId,
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      description: data.description,
      descriptionTranslations: data.descriptionTranslations || {},
      link: data.link,
      linkTranslations: data.linkTranslations || {},
      collections: parseArray('collections'),
      thumbnail: imageResults.thumbnail || '',
    };

    const equipment = await Equipment.create(equipmentData);
    if (equipment) await Setting.updateOne({}, { equipmentCheckpoint: new Date() });
    res.status(200).json({ result: true, equipment });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});


// Admin: Update equipment
const updateEquipmentAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    
    parseJSONFields(data);

    const parseArray = (field) => {
      if (!data[field]) return [];
      if (Array.isArray(data[field])) return data[field];
      try {
        return JSON.parse(data[field]);
      } catch {
        return [];
      }
    };

    const existingEquipment = await Equipment.findById(_id).lean();
    if (!existingEquipment) {
      return res.status(404).json({ result: false, message: 'Equipment not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'equipments',
      documentId: _id,
      existingDoc: existingEquipment,
      imageFields: ['thumbnail']
    });

    const equipmentData = {
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      description: data.description,
      descriptionTranslations: data.descriptionTranslations || {},
      link: data.link,
      linkTranslations: data.linkTranslations || {},
      collections: parseArray('collections'),
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingEquipment.thumbnail
    };

    const result = await Equipment.findByIdAndUpdate(_id, equipmentData, { new: true });
    if (result) await Setting.updateOne({}, { equipmentCheckpoint: new Date() });

    res.status(200).json({ result: true, equipment: result });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteEquipmentAdmin = asyncHandler(async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ result: false, message: "Equipment not found" });
    }

    const context = {
      collection: 'equipments',
      documentId: req.params.id
    };

    if (equipment.thumbnail) {
      await deleteImageWithRegistry(equipment.thumbnail, {
        ...context,
        fieldPath: 'thumbnail'
      });
    }

    await Equipment.findByIdAndDelete(req.params.id);
    await Setting.updateOne({}, { equipmentCheckpoint: new Date() });
    
    res.status(200).json({ result: true, message: "Equipment deleted successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
});


module.exports = {
  addEquipmentAdmin,
  updateEquipmentAdmin,
  deleteEquipmentAdmin,
  getEquipmentsAdmin,
  getEquipments,
  getEquipmentAdmin,
  getEquipmentTitlesAdmin,
};
