const asyncHandler = require("express-async-handler");
const Section = require("../models/programInfoModel");
const { getSortInfo } = require("../utils/utils");
const { parseJSONFields } = require('../utils/requestHelpers');

const getSectionsAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy = "NewestAdded" } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    const matchStage = search
      ? { $match: { title: { $regex: search, $options: "i" } } }
      : { $match: {} };

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : {};

    const skip = (page - 1) * perPage;

    const pipeline = [
      matchStage,
      {
        $facet: {
          sections: [
            ...(sortBy ? [sortStage] : []),
            { $skip: skip },
            { $limit: perPage },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Section.aggregate(pipeline).exec();
    const sections = result?.sections || [];
    const count = result?.totalCount[0]?.count || 0;

    res.status(200).json({ count, sections });
  } catch (error) {
    console.error("Error fetching sections admin:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getSections = asyncHandler(async (req, res) => {
  try {
    const sections = await Section.find({}).lean();
    sections.sort((a, b) => {
      const weekRegex = /^Week\s+(\d+)/i;
      const matchA = a.title?.match(weekRegex);
      const matchB = b.title?.match(weekRegex);
      if (!matchA && matchB) return -1;
      if (matchA && !matchB) return 1;
      if (!matchA && !matchB) return 0;
      const numA = parseInt(matchA[1], 10);
      const numB = parseInt(matchB[1], 10);

      return numA - numB;
    });

    res.status(200).json({ count: sections.length, sections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getSectionAdmin = asyncHandler(async (req, res) => {
  try {
    const section = await Section.findById(req.params.id).lean();
    res.status(200).json(section || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getSectionTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filter = req.query.filterString || "";
    const filteredSections = await Section.find(
      { title: { $regex: filter, $options: "i" } },
      { title: 1 }
    ).lean();
    res.status(200).json(filteredSections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});
const parseArrayField = (value) => {
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.flatMap(item => {
          if (typeof item === 'string' && item.startsWith('[')) {
            try {
              return JSON.parse(item);
            } catch {
              return [item];
            }
          }
          return [item];
        });
      }
      return [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (typeof item === 'string' && item.startsWith('[')) {
        try {
          return JSON.parse(item);
        } catch {
          return [item];
        }
      }
      return [item];
    });
  }

  return [];
};
const addSectionAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };
    parseJSONFields(data);

    const sectionData = {
      title: data.title,
      titleTranslations: data.titleTranslations || {},
      description: data.description,
      descriptionTranslations: data.descriptionTranslations || {},
      vimeoId: data.vimeoId,
      vimeoIdTranslations: data.vimeoIdTranslations || {},
    };

    const section = await Section.create(sectionData);
    res.status(200).json({ result: !!section });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateSectionAdmin = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };

    const { _id } = data;

    const existingSection = await Section.findById(_id).lean();
    if (!existingSection) {
      return res.status(404).json({ result: false, message: 'Section not found' });
    }

    const parseJSONField = (value) => {
      if (!value) return {};
      if (typeof value === 'object' && !Array.isArray(value)) return value;
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    };

    const sectionData = {
      title: data.title,
      titleTranslations: parseJSONField(data.titleTranslations),
      description: data.description,
      descriptionTranslations: parseJSONField(data.descriptionTranslations),
      vimeoId: data.vimeoId,
      vimeoIdTranslations: parseJSONField(data.vimeoIdTranslations),
      variations: parseArrayField(data.variations),
      formats: parseArrayField(data.formats),
    };

    const updated = await Section.findByIdAndUpdate(_id, sectionData, { new: true, lean: true });
    res.status(200).json({ result: !!updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteSectionAdmin = asyncHandler(async (req, res) => {
  try {
    const deleted = await Section.findOneAndDelete({
      _id: req.params.id,
    }).lean();
    res.status(200).json({ result: !!deleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getSectionsAdmin,
  getSections,
  getSectionAdmin,
  getSectionTitlesAdmin,
  addSectionAdmin,
  updateSectionAdmin,
  deleteSectionAdmin,
};
