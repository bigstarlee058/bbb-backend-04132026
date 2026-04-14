const asyncHandler = require("express-async-handler");
const PumpDay = require("../models/pumpDayModel");
const { getSortInfo } = require("../utils/utils");

const getPumpDaysAdmin = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search, sortBy } = req.query;
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
          pumpDays: [
            ...(sortBy ? [sortStage] : []),
            { $skip: skip },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await PumpDay.aggregate(pipeline).exec();

    const pumpDays = result?.pumpDays || [];
    const count = result?.totalCount[0]?.count || 0;

    res.status(200).json({ count, pumpDays });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getPumpDayAdmin = asyncHandler(async (req, res) => {
  try {
    const pumpDayDoc = await PumpDay.findOne({ _id: req.params.id })
      .populate({
        path: "exercises.exerciseId",
        select: "title titleTranslations thumbnail thumbnailTranslations vimeoId vimeoIdTranslations",
      })
      .populate({
        path: "circuits.circuitExercises.exerciseId",
        select: "title titleTranslations thumbnail thumbnailTranslations vimeoId vimeoIdTranslations",
      })
      .populate({
        path: "warmups.warmupId",
        select: "thumbnail",
      });

    if (!pumpDayDoc) return res.status(404).json({ message: "PumpDay not found" });

    const pumpDay = pumpDayDoc.toObject({ flattenMaps: true });

    if (pumpDay.exercises) {
      pumpDay.exercises = pumpDay.exercises.map(({ exerciseId, ...rest }) => ({
        ...rest,
        exerciseId: exerciseId?._id || null,
        title: exerciseId?.title || null,
        titleTranslations: exerciseId?.titleTranslations || {},
        thumbnail: exerciseId?.thumbnail || null,
        thumbnailTranslations: exerciseId?.thumbnailTranslations || {},
        vimeoId: exerciseId?.vimeoId || null,
        vimeoIdTranslations: exerciseId?.vimeoIdTranslations || {},
      }));
    }

    if (pumpDay.circuits) {
      pumpDay.circuits = pumpDay.circuits.map((circuit) => ({
        ...circuit,
        circuitExercises: circuit.circuitExercises.map(
          ({ exerciseId, ...rest }) => ({
            ...rest,
            exerciseId: exerciseId?._id || null,
            title: exerciseId?.title || null,
            titleTranslations: exerciseId?.titleTranslations || {},
            thumbnail: exerciseId?.thumbnail || null,
            thumbnailTranslations: exerciseId?.thumbnailTranslations || {},
            vimeoId: exerciseId?.vimeoId || null,
            vimeoIdTranslations: exerciseId?.vimeoIdTranslations || {},
          })
        ),
      }));
    }

    if (pumpDay.warmups) {
      pumpDay.warmups = pumpDay.warmups.map(({ warmupId, ...rest }) => ({
        ...rest,
        warmupId: warmupId?._id || null,
        thumbnail: warmupId?.thumbnail || null,
      }));
    }

    res.status(200).json(pumpDay);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getPumpDayTitlesAdmin = asyncHandler(async (req, res) => {
  try {
    const filter = req.query.filterString || "";
    const filteredPumpDays = await PumpDay.find(
      { title: { $regex: filter, $options: "i" } },
      { title: 1 }
    ).lean();
    res.status(200).json(filteredPumpDays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

const updatePumpDayAdmin = asyncHandler(async (req, res) => {
  try {
    const { _id, title, description, vimeoId, circuits } = req.body;
    const updated = await PumpDay.findOneAndUpdate(
      { _id },
      { title, description, vimeoId, circuits: JSON.parse(circuits) },
      { new: true, lean: true }
    );
    res.status(200).json({ result: !!updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const savePumpDays = asyncHandler(async (req, res) => {
  try {
    const { days } = req.body;
    if (!Array.isArray(days)) {
      return res
        .status(400)
        .json({ result: false, message: "'days' must be an array." });
    }
    
    const incomingIds = days.filter(day => day._id).map(day => day._id);

    await PumpDay.deleteMany({ _id: { $nin: incomingIds } });

    const bulkOps = days.map(day => {
      if (day._id) {
        return {
          updateOne: {
            filter: { _id: day._id },
            update: { $set: day },
            upsert: false
          }
        };
      } else {
        return {
          insertOne: {
            document: day
          }
        };
      }
    });

    if (bulkOps.length > 0) {
      await PumpDay.bulkWrite(bulkOps);
    }

    res
      .status(200)
      .json({ result: true, message: "Pump days saved successfully!" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        result: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
});

module.exports = {
  getPumpDaysAdmin,
  updatePumpDayAdmin,
  getPumpDayAdmin,
  getPumpDayTitlesAdmin,
  savePumpDays,
};
