const asyncHandler = require("express-async-handler");
const PhasesMainInfo = require("../models/phasesmaininfoModel");
const Phases = require("../models/phasesModel");
const { getSortInfo } = require("../utils/utils");
const mongoose = require('mongoose');
const { parseJSONFields } = require('../utils/requestHelpers');
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const getPhasesAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy="NewestAdded" } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const match = search ? { question: { $regex: search, $options: "i" } } : {};

    const order = sortBy ? getSortInfo(sortBy) : {};

    const countPromise = Phases.countDocuments(match);
    const phasesPromise = Phases.find(match)
      .sort(order)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    const [phases, count] = await Promise.all([phasesPromise, countPromise]);
    res.status(200).json({ count, phases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getPhasesMainInfo = asyncHandler(async (req, res) => {
  try {
    const phasesmaininfo = await PhasesMainInfo.findOne({}).lean();
    res.status(200).json({ phasesmaininfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getAllPhases = asyncHandler(async (req, res) => {
  try {
    const [phases, phasesmaininfo] = await Promise.all([
      Phases.find({}).lean(),
      PhasesMainInfo.findOne({}).lean(),
    ]);

    // Sort phases with custom logic
    phases.sort((a, b) => {
      const monthRegex = /^Month\s+(\d+)/i;
      
      const matchA = a.title?.match(monthRegex);
      const matchB = b.title?.match(monthRegex);
      if (!matchA && matchB) return -1;
      if (matchA && !matchB) return 1;
      if (!matchA && !matchB) return 0;
      const numA = parseInt(matchA[1], 10);
      const numB = parseInt(matchB[1], 10);
      return numA - numB;
    });

    res.status(200).json({ phasesmaininfo, phases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getPhaseAdmin = asyncHandler(async (req, res) => {
  try {
    const phase = await Phases.findById(req.params.id).lean();
    if (!phase)
      return res
        .status(404)
        .json({ result: false, message: "Phase not found" });
    res.status(200).json(phase);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const addPhasesAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const newId = new mongoose.Types.ObjectId();
    const imageResults = await processImageFields({
      req,
      collection: 'phases',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['thumbnail']
    });

    const phaseData = {
      _id: newId,
      title: data.title,
      description: data.description,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail || '',
    };

    const phase = await Phases.create(phaseData);
    res.status(200).json({ result: true, phase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updatePhasesAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    const { _id } = data;
    parseJSONFields(data);

    const existingPhase = await Phases.findById(_id).lean();
    if (!existingPhase) {
      return res.status(404).json({ result: false, message: 'Phase not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'phases',
      documentId: _id,
      existingDoc: existingPhase,
      imageFields: ['thumbnail']
    });

    const phaseData = {
      title: data.title,
      description: data.description,
      titleTranslations: data.titleTranslations || {},
      descriptionTranslations: data.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingPhase.thumbnail,
    };

    const phase = await Phases.findByIdAndUpdate(_id, phaseData, { new: true });
    res.status(200).json({ result: true, phase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updatePhasesMaininfo = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);
    let existingDoc = await PhasesMainInfo.findOne({}).lean();
    const isNew = !existingDoc;
    
    if (isNew) {
      existingDoc = {};
    }

    const documentId = existingDoc._id?.toString() || new mongoose.Types.ObjectId().toString();

    const imageResults = await processImageFields({
      req,
      collection: 'phasesmaininfo',
      documentId,
      existingDoc,
      imageFields: ['thumbnail']
    });

    const updateData = {
      title: data.title,
      titleTranslations: data.titleTranslations || existingDoc.titleTranslations || {},
      contenttitle: data.contenttitle,
      contenttitleTranslations: data.contenttitleTranslations || existingDoc.contenttitleTranslations || {},
      description: data.description,
      descriptionTranslations: data.descriptionTranslations || existingDoc.descriptionTranslations || {},
      thumbnail: imageResults.thumbnail !== undefined ? imageResults.thumbnail : existingDoc.thumbnail,
      thumbnailTranslations: imageResults.thumbnailTranslations || existingDoc.thumbnailTranslations || {},
    };

    const updated = await PhasesMainInfo.findOneAndUpdate(
      {},
      updateData,
      { upsert: true, new: true }
    ).lean();

    res.status(200).json({ result: !!updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deletePhasesAdmin = asyncHandler(async (req, res) => {
  try {
    const phase = await Phases.findById(req.params.id);
    if (!phase) {
      return res.status(404).json({ result: false, message: "Phase not found" });
    }

    const context = { collection: 'phases', documentId: req.params.id };

    if (phase.thumbnail) {
      await deleteImageWithRegistry(phase.thumbnail, { ...context, fieldPath: 'thumbnail' });
    }

    await Phases.findByIdAndDelete(req.params.id);
    res.status(200).json({ result: true, message: "Phase deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getPhasesAdmin,
  getPhasesMainInfo,
  getPhaseAdmin,
  getAllPhases,
  addPhasesAdmin,
  updatePhasesAdmin,
  updatePhasesMaininfo,
  deletePhasesAdmin,
};
