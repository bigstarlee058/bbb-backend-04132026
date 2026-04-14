const asyncHandler = require("express-async-handler");
const Challenge = require("../models/challengeModel");
const { getSortInfo } = require("../utils/utils");
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const mongoose = require('mongoose');
const getChallengesAdmin = asyncHandler(async (req, res) => {
  try {
    var { page = 1, perPage = 10, search, sortBy="NewestAdded" } = req.query;
    const pipeline = [];

    if (search) {
      pipeline.push({
        $match: {
          $or: [{ title: { $regex: new RegExp(search, 'i') } }],
        },
      });
    }

    const totalCount = [
      {
        $count: 'totalMatchingDocuments',
      },
    ];

    const pipelineChallenges = [];

    if (sortBy) {
      var order = getSortInfo(sortBy);

      pipelineChallenges.push({
        $sort: order,
      });
    }

    // Pagination
    if (perPage && page) {
      const skip = (page - 1) * perPage;
      pipelineChallenges.push({ $skip: skip });
      pipelineChallenges.push({ $limit: parseInt(perPage) });
    }

    const facet = {
      $facet: {
        populatedChallenges: pipelineChallenges,
        totalCount: totalCount,
      },
    };
    pipeline.push(facet);

    const results = await Challenge.aggregate(pipeline);

    var challenges = [];
    var count = 0;

    if (results.length != 0) {
      challenges = results[0].populatedChallenges;

      if (results[0].totalCount.length != 0)
        count = results[0].totalCount[0].totalMatchingDocuments;

      // Populate user details for each challenge
      challenges = await Challenge.populate(challenges, {
        path: 'joinedUsers',
        select: 'name email', // Select specific fields to populate (adjust as necessary)
      });
    }

    res.status(200).json({ count: count, challenges: challenges });
  } catch (error) {
    console.log(error);
  }
});

const getChallenges = asyncHandler(async (req, res) => {
  try {
    const [challenges, count] = await Promise.all([
      Challenge.find({ isHide: false })
        .populate("joinedUsers", "name email")
        .lean(),
      Challenge.countDocuments({ isHide: false }),
    ]);

    res.status(200).json({ count, challenges });
  } catch (error) {
    res.status(200).json({ count: 0, challenges: [] });
  }
});

const getChallengeAdmin = asyncHandler(async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id })
      .populate("joinedUsers", "name email")
      .lean();

    res.status(200).json(challenge || {});
  } catch (error) {
    res.status(200).json({});
  }
});

const getChallengeTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filterString = req.query.filterString || "";
    const filteredChallenges = await Challenge.find(
      { title: { $regex: filterString, $options: "i" } },
      { title: 1, _id: 1 }
    ).lean();

    res.status(200).json(filteredChallenges);
  } catch (error) {
    res.status(200).json([]);
  }
});

const addChallengeAdmin = asyncHandler(async (req, res) => {
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
      collection: 'challenges',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['photo']
    });

    const challengeData = {
      _id: newId,
      title: data.title,
      titleTranslations: parseJSONField('titleTranslations'),
      description: data.description,
      descriptionTranslations: parseJSONField('descriptionTranslations'),
      link: data.link,
      linkTranslations: parseJSONField('linkTranslations'),
      buttonText: data.buttonText,
      buttonTextTranslations: parseJSONField('buttonTextTranslations'),
      isHide: data.isHide === "true" || data.isHide === true,
      photo: imageResults.photo || '',
      photoTranslations: imageResults.photoTranslations || {},
    };

    const challenge = await Challenge.create(challengeData);

    res.status(200).json({ result: true, challenge });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const updateChallengeAdmin = asyncHandler(async (req, res) => {
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

    const existingChallenge = await Challenge.findById(_id).lean();
    if (!existingChallenge) {
      return res.status(404).json({ result: false, message: 'Challenge not found' });
    }

    const imageResults = await processImageFields({
      req,
      collection: 'challenges',
      documentId: _id,
      existingDoc: existingChallenge,
      imageFields: ['photo']
    });

    const challengeData = {
      title: data.title,
      titleTranslations: parseJSONField('titleTranslations'),
      description: data.description,
      descriptionTranslations: parseJSONField('descriptionTranslations'),
      link: data.link,
      linkTranslations: parseJSONField('linkTranslations'),
      buttonText: data.buttonText,
      buttonTextTranslations: parseJSONField('buttonTextTranslations'),
      isHide: data.isHide === "true" || data.isHide === true,
      photo: imageResults.photo !== undefined ? imageResults.photo : existingChallenge.photo,
      photoTranslations: imageResults.photoTranslations || existingChallenge.photoTranslations || {},
    };

    const challenge = await Challenge.findByIdAndUpdate(_id, challengeData, { new: true });

    res.status(200).json({ result: true, challenge, id: challenge?._id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const deleteChallengeAdmin = asyncHandler(async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ result: false, message: "Challenge not found" });
    }

    const context = {
      collection: 'challenges',
      documentId: req.params.id
    };

    // Delete main photo
    if (challenge.photo) {
      await deleteImageWithRegistry(challenge.photo, {
        ...context,
        fieldPath: 'photo'
      });
    }

    // Delete photo translations
    if (challenge.photoTranslations) {
      const translations = challenge.photoTranslations instanceof Map
        ? Object.fromEntries(challenge.photoTranslations)
        : challenge.photoTranslations;

      for (const [lang, imageUrl] of Object.entries(translations)) {
        if (imageUrl && typeof imageUrl === 'string') {
          await deleteImageWithRegistry(imageUrl, {
            ...context,
            fieldPath: `photoTranslations.${lang}`
          });
        }
      }
    }

    await Challenge.findByIdAndDelete(req.params.id);

    res.status(200).json({ result: true, message: "Challenge deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const joinChallenge = asyncHandler(async (req, res) => {
  try {
    const { _id, joinedUserId } = req.body;
    if (!_id || !joinedUserId) {
      return res.status(200).json({ result: false });
    }
    const result = await Challenge.findByIdAndUpdate(
      _id,
      { $addToSet: { joinedUsers: joinedUserId } },
      { new: true, lean: true }
    );
    res.status(200).json({ result: !!result });
  } catch {
    res.status(200).json({ result: false });
  }
});

const getFeaturedChallenge = asyncHandler(async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ isHide: false }).lean();
    if (!challenge) {
      return res.status(200).json({});
    }

    const { _id, isHide, isFeatured, ...rest } = challenge;

    res.status(200).json({
      id: _id,
      ...rest,
    });
  } catch {
    res.status(200).json({});
  }
});
const toggleChallengeVisibility = asyncHandler(async (req, res) => {
  try {
    const { challengeId, isHide } = req.body;

    const result = await Challenge.findByIdAndUpdate(
      challengeId,
      { $set: { isHide } },
      { new: true }
    );

    res.status(200).json({ result: !!result });
  } catch {
    res.status(200).json({ result: false });
  }
});
module.exports = {
  getChallengesAdmin,
  getChallenges,
  addChallengeAdmin,
  updateChallengeAdmin,
  deleteChallengeAdmin,
  getChallengeAdmin,
  getChallengeTitlesAdmin,
  joinChallenge,
  getFeaturedChallenge,
  toggleChallengeVisibility
};
