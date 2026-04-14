const asyncHandler = require("express-async-handler");
const Download = require("../models/downloadModel");
const { getSortInfo } = require("../utils/utils");
const { processImageFields } = require('../utils/files/google/imageProcessor');
const { deleteImageWithRegistry } = require('../utils/files/google/imageOperations');
const mongoose = require('mongoose');

const getDownloadsAdmin = asyncHandler(async (req, res) => {
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

    const sortStage = sortBy ? { $sort: getSortInfo(sortBy) } : { $sort: { createdAt: -1 } };
    const skipStage = { $skip: (page - 1) * perPage };
    const limitStage = { $limit: perPage };

    const lookupStage = {
      $lookup: {
        from: "months",
        localField: "monthId",
        foreignField: "_id",
        as: "month",
      },
    };
    const unwindStage = {
      $unwind: {
        path: "$month",
        preserveNullAndEmptyArrays: true,
      },
    };

    const pipeline = [];
    if (matchStage) pipeline.push(matchStage);
    pipeline.push({
      $facet: {
        data: [
          lookupStage,
          unwindStage,
          sortStage,
          skipStage,
          limitStage,
        ].filter(Boolean),
        total: [{ $count: "count" }],
      },
    });

    const [result] = await Download.aggregate(pipeline);

    res.status(200).json({
      count: result?.total?.[0]?.count || 0,
      downloads: result?.data || [],
    });
  } catch (error) {
    console.error("Error fetching downloads:", error);
    res.status(200).json({ count: 0, downloads: [], message: error.message });
  }
});

const getDownloads = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const userMonthIds = req.user?.accessedMonths?.map(
      (entry) => entry.monthId?.toString()
    ) || [];

    if (userMonthIds.length === 0) {
      return res.status(200).json({ count: 0, downloads: [] });
    }

    const query = {
      monthId: { $in: userMonthIds },
      releaseDate: { $lte: now }
    };

    const [downloads, count] = await Promise.all([
      Download.find(query)
        .sort({ releaseDate: -1 })
        .populate('monthId', 'title titleTranslations startDate endDate')
        .lean(),
      Download.countDocuments(query),
    ]);

    const convertMapToObject = (mapField) => {
      if (!mapField) return {};
      if (mapField instanceof Map) return Object.fromEntries(mapField);
      if (typeof mapField === 'object') return mapField;
      return {};
    };

    const formattedDownloads = downloads.map(download => ({
      ...download,
      titleTranslations: convertMapToObject(download.titleTranslations),
      descriptionTranslations: convertMapToObject(download.descriptionTranslations),
      pdfTranslations: convertMapToObject(download.pdfTranslations),
      month: download.monthId ? {
        _id: download.monthId._id,
        title: download.monthId.title,
        titleTranslations: convertMapToObject(download.monthId.titleTranslations),
        startDate: download.monthId.startDate,
        endDate: download.monthId.endDate,
      } : null,
    }));

    const cleanedDownloads = formattedDownloads.map(({ monthId, ...rest }) => rest);

    res.status(200).json({ count, downloads: cleanedDownloads });
  } catch (error) {
    console.error("Error fetching downloads:", error);
    res.status(200).json({ count: 0, downloads: [] });
  }
});

const getFeaturedDownloads = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const downloads = await Download.find({
      releaseDate: { $lte: now }
    }).sort({ releaseDate: -1 }).lean();

    const convertMapToObject = (mapField) => {
      if (!mapField) return {};
      if (mapField instanceof Map) return Object.fromEntries(mapField);
      if (typeof mapField === 'object') return mapField;
      return {};
    };

    const formattedDownloads = downloads.map(download => ({
      ...download,
      titleTranslations: convertMapToObject(download.titleTranslations),
      descriptionTranslations: convertMapToObject(download.descriptionTranslations),
      pdfTranslations: convertMapToObject(download.pdfTranslations),
    }));

    res.status(200).json({
      downloads: formattedDownloads,
      count: formattedDownloads.length,
    });
  } catch (error) {
    console.error("Error fetching featured downloads:", error);
    res.status(200).json({ downloads: [], count: 0 });
  }
});

const getDownloadAdmin = asyncHandler(async (req, res) => {
  try {
    const download = await Download.findById(req.params.id).lean();

    if (!download) {
      return res.status(200).json({ result: false, message: "Download not found" });
    }

    res.status(200).json(download);
  } catch (error) {
    console.error("Error fetching download:", error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const getDownload = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const download = await Download.findOne({
      _id: req.params.id,
    }).lean();

    if (!download) {
      return res.status(200).json({ result: false, message: "Download not found" });
    }

    const convertMapToObject = (mapField) => {
      if (!mapField) return {};
      if (mapField instanceof Map) return Object.fromEntries(mapField);
      if (typeof mapField === 'object') return mapField;
      return {};
    };

    const formattedDownload = {
      ...download,
      titleTranslations: convertMapToObject(download.titleTranslations),
      descriptionTranslations: convertMapToObject(download.descriptionTranslations),
      pdfTranslations: convertMapToObject(download.pdfTranslations),
    };

    res.status(200).json(formattedDownload);
  } catch (error) {
    console.error("Error fetching download:", error);
    res.status(200).json({ result: false, message: error.message });
  }
});

const addDownloadAdmin = asyncHandler(async (req, res) => {
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

    const fileResults = await processImageFields({
      req,
      collection: 'downloads',
      documentId: newId.toString(),
      existingDoc: {},
      imageFields: ['pdf']
    });

    const downloadData = {
      _id: newId,
      title: data.title,
      titleTranslations: parseJSONField('titleTranslations'),
      description: data.description,
      descriptionTranslations: parseJSONField('descriptionTranslations'),
      pdf: fileResults.pdf || '',
      pdfTranslations: fileResults.pdfTranslations || {},
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      monthId: data.monthId || null,
    };

    const download = await Download.create(downloadData);

    res.status(200).json({ result: true, download });
  } catch (error) {
    console.error("Error adding download:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const updateDownloadAdmin = asyncHandler(async (req, res) => {
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

    const existingDownload = await Download.findById(_id).lean();
    if (!existingDownload) {
      return res.status(404).json({ result: false, message: 'Download not found' });
    }

    const fileResults = await processImageFields({
      req,
      collection: 'downloads',
      documentId: _id,
      existingDoc: existingDownload,
      imageFields: ['pdf']
    });

    const downloadData = {
      title: data.title,
      titleTranslations: parseJSONField('titleTranslations'),
      description: data.description,
      descriptionTranslations: parseJSONField('descriptionTranslations'),
      pdf: fileResults.pdf !== undefined ? fileResults.pdf : existingDownload.pdf,
      pdfTranslations: fileResults.pdfTranslations || existingDownload.pdfTranslations || {},
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : existingDownload.releaseDate,
      monthId: data.monthId || existingDownload.monthId,
    };

    const download = await Download.findByIdAndUpdate(_id, downloadData, { new: true });

    res.status(200).json({ result: true, download, id: download?._id });
  } catch (error) {
    console.error("Error updating download:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const deleteDownloadAdmin = asyncHandler(async (req, res) => {
  try {
    const download = await Download.findById(req.params.id);
    if (!download) {
      return res.status(404).json({ result: false, message: "Download not found" });
    }

    const context = {
      collection: 'downloads',
      documentId: req.params.id
    };

    if (download.pdf) {
      await deleteImageWithRegistry(download.pdf, {
        ...context,
        fieldPath: 'pdf'
      });
    }

    if (download.pdfTranslations) {
      const translations = download.pdfTranslations instanceof Map
        ? Object.fromEntries(download.pdfTranslations)
        : download.pdfTranslations;

      for (const [lang, fileUrl] of Object.entries(translations)) {
        if (fileUrl && typeof fileUrl === 'string') {
          await deleteImageWithRegistry(fileUrl, {
            ...context,
            fieldPath: `pdfTranslations.${lang}`
          });
        }
      }
    }

    await Download.findByIdAndDelete(req.params.id);

    res.status(200).json({ result: true, message: "Download deleted successfully" });
  } catch (error) {
    console.error("Error deleting download:", error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getUpcomingDownloads = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const downloads = await Download.find({
      releaseDate: { $gt: now }
    }).sort({ releaseDate: 1 }).lean();

    const convertMapToObject = (mapField) => {
      if (!mapField) return {};
      if (mapField instanceof Map) return Object.fromEntries(mapField);
      if (typeof mapField === 'object') return mapField;
      return {};
    };

    const formattedDownloads = downloads.map(download => ({
      ...download,
      titleTranslations: convertMapToObject(download.titleTranslations),
      descriptionTranslations: convertMapToObject(download.descriptionTranslations),
      pdfTranslations: convertMapToObject(download.pdfTranslations),
    }));

    res.status(200).json({
      count: formattedDownloads.length,
      downloads: formattedDownloads,
    });
  } catch (error) {
    console.error("Error fetching upcoming downloads:", error);
    res.status(200).json({ count: 0, downloads: [] });
  }
});

module.exports = {
  getDownloadsAdmin,
  getDownloads,
  getFeaturedDownloads,
  getDownloadAdmin,
  getDownload,
  addDownloadAdmin,
  updateDownloadAdmin,
  deleteDownloadAdmin,
  getUpcomingDownloads,
};