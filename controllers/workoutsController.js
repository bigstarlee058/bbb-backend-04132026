const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Month = require("../models/workoutModel");
const Setting = require("../models/settingModel");
const UpdatedMonth = require("../models/updatedWorkoutModel");
const Exercise = require("../models/exerciseModel");
const { getSubscriptionStatus } = require("../utils/woo");
const { uploadImage } = require("../utils/files/google/gcs");
const { getVimeoDetails } = require("../utils/utils");
const EditLock = require("../models/editLock");
const User = require("../models/userModel");
const getVideoUrlfromVimeoId = asyncHandler(async (req, res) => {
  try {
    const vimeoDetails = await getVimeoDetails(req.params.id);
    return res.status(200).json({ files: vimeoDetails.files || [] });
  } catch (error) {
    return res.status(200).json({ files: [] });
  }
});

const getWorkouts = asyncHandler(async (req, res) => {
  try {
    let { page = 1, perPage = 10, search } = req.query;
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
      : null;

    const pipeline = matchStage ? [matchStage] : [];

    pipeline.push({
      $facet: {
        populatedMonths: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalCount: [{ $count: "totalMatchingDocuments" }],
      },
    });

    const [results] = await Month.aggregate(pipeline).exec();
    const months = results?.populatedMonths || [];
    const count = results?.totalCount?.[0]?.totalMatchingDocuments || 0;

    const populatedMonths = await Month.populate(months, {
      path: "weeks.days.exercises.exercise",
      select: "title",
    });

    return res.status(200).json({ count, months: populatedMonths });
  } catch (error) {
    return res.status(500).json({ count: 0, months: [], error: error.message });
  }
});

const getWorkoutById = asyncHandler(async (req, res) => {
  try {
    const workout = await Month.findById(req.params.id).lean();
    if (workout) return res.status(200).json(workout);
    return res.status(200).json({});
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const updateWorkouts = asyncHandler(async (req, res) => {
  const now = new Date();
  const lock = await EditLock.findOne({
    resourceType: "workouts",
    expiresAt: { $gt: now },
  });

  if (!lock || lock.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: "You do not hold the editing lock. Another admin may be editing.",
    });
  }
  try {
    const months = req.body.months;
    if (!Array.isArray(months))
      return res.status(200).json({ message: "Invalid input data" });

    const existingMonths = await Month.find({}).lean();
    const existingMonthIds = existingMonths.map((m) => m._id.toString());
    const receivedMonthIds = months
      .map((m) => m._id?.toString())
      .filter(Boolean);
    const monthsToDelete = existingMonthIds.filter(id => !receivedMonthIds.includes(id));
    const operations = months.map((month, index) => {
      if (month._id && mongoose.Types.ObjectId.isValid(month._id)) {
        return {
          updateOne: {
            filter: { _id: month._id },
            update: { $set: { ...month, index: index + 1 } },
            upsert: false,
          },
        };
      } else {
        const { _id, ...monthWithoutId } = month;
        return {
          insertOne: { document: { ...monthWithoutId, index: index + 1 } },
        };
      }
    });

    monthsToDelete.forEach((id) =>
      operations.push({ deleteOne: { filter: { _id: id } } })
    );

    await Promise.all([
      Month.bulkWrite(operations),
      updateIndexes(),
      Setting.updateOne({}, { workoutCheckpoint: new Date() }),
    ]);

    return res.status(200).json({ message: "Workouts saved successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

const updateIndexes = async () => {
  // Update month indexes
  const months = await Month.find({}).sort({ index: 1 }).lean();
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    await Month.findByIdAndUpdate(month._id, { $set: { index: i + 1 } });

    // Update weeks and days indexes
    for (let j = 0; j < month.weeks.length; j++) {
      const week = month.weeks[j];
      await Month.updateOne(
        { _id: month._id, 'weeks._id': week._id },
        { $set: { 'weeks.$.index': j + 1 } }
      );
    }
  }
};

const updateMonths = asyncHandler(async (req, res) => {
  try {
    const { months: usermonths, uid } = req.body;

    if (!Array.isArray(usermonths)) {
      return res.status(400).json({
        message: "Invalid input data: months array is empty or not an array",
      });
    }

    const existingMonths = await UpdatedMonth.find({ uid }).lean();
    const existingMonthIds = existingMonths.map((month) =>
      month._id.toString()
    );

    const receivedMonthIds = usermonths
      .map((month) => month._id?.toString())
      .filter((id) => id);
    const monthsToDelete = existingMonthIds.filter(
      (id) => !receivedMonthIds.includes(id)
    );

    const operations = usermonths.map((month, index) => {
      if (month._id && mongoose.Types.ObjectId.isValid(month._id)) {
        return {
          updateOne: {
            filter: { _id: month._id },
            update: { $set: { ...month, index: index + 1 } },
            upsert: false,
          },
        };
      } else {
        const { _id, ...monthWithoutId } = month;
        return {
          insertOne: {
            document: { ...monthWithoutId, index: index + 1, uid },
          },
        };
      }
    });

    monthsToDelete.forEach((monthId) => {
      operations.push({ deleteOne: { filter: { _id: monthId } } });
    });

    if (operations.length > 0) await UpdatedMonth.bulkWrite(operations);

    await updateNewIndexes(uid);

    res.status(200).json({ message: "Workouts saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const updateNewIndexes = async (uid) => {
  try {
    const months = await UpdatedMonth.find({ uid }).sort({ index: 1 }).lean();

    await Promise.all(
      months.map(async (month, monthIdx) => {
        const monthUpdate = UpdatedMonth.findByIdAndUpdate(month._id, {
          $set: { index: monthIdx + 1 },
        });

        const weeksUpdate = month.weeks?.length
          ? Promise.all(
            month.weeks.map((week, weekIdx) =>
              UpdatedMonth.updateOne(
                { _id: month._id, "weeks._id": week._id },
                { $set: { "weeks.$.index": weekIdx + 1 } }
              )
            )
          )
          : Promise.resolve();

        await Promise.all([monthUpdate, weeksUpdate]);
      })
    );
  } catch (error) {
    console.error("Error updating indexes:", error.message);
  }
};
const assignMonthToUser = (userId, monthId) => {
  User.findById(userId)
    .select('accessedMonths')
    .lean()
    .then((user) => {
      if (!user) return;
      const monthsArray = Array.isArray(user.accessedMonths) ? user.accessedMonths : [];
      const alreadyAssigned = monthsArray.some(
        (entry) => entry?.monthId?.toString() === monthId.toString()
      );
      if (!alreadyAssigned) {
       User.findByIdAndUpdate(userId, {
          $push: {
            accessedMonths: {
              monthId: monthId,
              assignedAt: new Date(),
            }
          }
        }).exec();
      }
    })
    .catch((err) => console.error("Month assignment error:", err));
};

const getWorkoutForCurrentMonth = asyncHandler(async (req, res) => {
  try {
    const weekStartDay = req.userSettings?.weekStartDay || "monday";
    let dateString = req.body.date;
    if (dateString.includes(' ')) dateString = dateString.replace(' ', 'T');
    if (!dateString.endsWith('Z')) dateString += 'Z';

    const inputDate = new Date(dateString);
    console.log("incoming date:", inputDate.toISOString(), "| weekStartDay:", weekStartDay);

    inputDate.setUTCDate(inputDate.getUTCDate() - 1);
    if (weekStartDay === "monday") {
      inputDate.setUTCDate(inputDate.getUTCDate() - 1);
    }
    console.log("processed date:", inputDate.toISOString());

    const estStartTime = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate(), 0, 0, 0));
    const estEndTime = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate(), 23, 59, 59));

    const workout = await Month.findOne({
      $and: [
        { $or: [{ startDate: { $lte: estEndTime } }, { startDate: null }] },
        { $or: [{ endDate: { $gte: estStartTime } }, { endDate: null }] },
      ],
    })
      .sort({ startDate: -1 })
      .populate("weeks.days.warmups.warmupId")
      .lean();

    if (!workout) return res.status(404).json({ message: "Workout not found" });
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 12);
    const isCurrentMonth = workout.startDate <= now && workout.endDate >= now;
    const isSubscribed = req.user?.subscription?.user_subscription_status === 'subscribed_user';
    if (req.user?._id && isSubscribed && isCurrentMonth) {
      assignMonthToUser(req.user._id, workout._id);
    }
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    console.log("month found:", formatDate(workout.startDate), "→", formatDate(workout.endDate));

    const exerciseIds = [];
    workout.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.warmups = day.warmups.map((warmup) => ({
          ...warmup,
          thumbnail: warmup.warmupId?.thumbnail || "",
          warmupId: warmup.warmupId?._id || null,
        }));
        day.exercises.forEach((exercise) => {
          if (exercise.exerciseId) exerciseIds.push(exercise.exerciseId);
        });
      });
    });

    const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();
    const exerciseMap = exercises.reduce((map, ex) => {
      map[ex._id] = { name: ex.title, thumbnail: ex.thumbnail, nameTranslations: ex.titleTranslations };
      return map;
    }, {});

    workout.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises = day.exercises.map((exercise) => {
          const data = exerciseMap[exercise.exerciseId];
          return {
            ...exercise,
            name: data?.name || "",
            thumbnails: data?.thumbnail || "",
            nameTranslations: data?.nameTranslations
          };
        });
      });
    });

    res.status(200).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const workoutCurrentMonth = asyncHandler(async (req, res) => {

  try {
    let dateString = req.body.date;
    if (dateString.includes(' ')) dateString = dateString.replace(' ', 'T');
    if (!dateString.endsWith('Z')) dateString += 'Z';

    const inputDate = new Date(dateString);
    const explicitClientWeekStartDay =
      req.body.weekStartDay === 'sunday' || req.body.weekStartDay === 'monday'
        ? req.body.weekStartDay
        : null;
    const persistedWeekStartDay = req.userSettings?.weekStartDay;
    const legacyClientWeekStartDay = req.body.isSundayUser === 'true'
      ? 'sunday'
      : 'monday';
    const effectiveWeekStartDay =
      explicitClientWeekStartDay ||
      (persistedWeekStartDay === 'sunday' || persistedWeekStartDay === 'monday'
        ? persistedWeekStartDay
        : null) ||
      legacyClientWeekStartDay;

    if (effectiveWeekStartDay !== 'sunday') {
      inputDate.setUTCDate(inputDate.getUTCDate() - 1);
    }
    const estStartTime = new Date(Date.UTC(
      inputDate.getUTCFullYear(),
      inputDate.getUTCMonth(),
      inputDate.getUTCDate(),
      0, 0, 0
    ));
    const estEndTime = new Date(Date.UTC(
      inputDate.getUTCFullYear(),
      inputDate.getUTCMonth(),
      inputDate.getUTCDate(),
      23, 59, 59
    ));
    const query = {
      $and: [
        { $or: [{ startDate: { $lte: estEndTime } }, { startDate: null }] },
        { $or: [{ endDate: { $gte: estStartTime } }, { endDate: null }] },
      ],
    };

    const workout = await Month.findOne(query)
      .sort({ startDate: -1 })
      .populate("weeks.days.warmups.warmupId")
      .lean();

    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 12);
    const isCurrentMonth = workout.startDate <= now && workout.endDate >= now;
    const isSubscribed = req.user?.subscription?.user_subscription_status === 'subscribed_user';

    if (req.user?._id && isSubscribed && isCurrentMonth) {
      assignMonthToUser(req.user._id, workout._id);
    }
    const exerciseIds = [];
    workout.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.warmups = day.warmups.map((warmup) => ({
          ...warmup,
          thumbnail: warmup.warmupId?.thumbnail || "",
          warmupId: warmup.warmupId?._id || null,
        }));
        day.exercises.forEach((exercise) => {
          if (exercise.exerciseId) exerciseIds.push(exercise.exerciseId);
        });
      });
    });

    const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();
    const exerciseMap = exercises.reduce((map, ex) => {
      map[ex._id] = { name: ex.title, thumbnail: ex.thumbnail, nameTranslations: ex.titleTranslations };
      return map;
    }, {});

    workout.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises = day.exercises.map((exercise) => {
          const data = exerciseMap[exercise.exerciseId];
          return {
            ...exercise,
            name: data?.name || "",
            thumbnails: data?.thumbnail || "",
            nameTranslations: data?.nameTranslations
          };
        });
      });
    });
    res.status(200).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const checkSubscription = asyncHandler(async (req, res) => {
  try {
    const response = await getSubscriptionStatus(req.user.uid);
    const status = response.isPT || response.isPTA;
    if (!status) {
      return res.status(200).json({
        success: false,
        message: "You need to purchase subscriptions",
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const imageUrlGenerator = asyncHandler(async (req, res) => {
  try {
    if (req.files?.length) {
      const thumbnails = await Promise.all(
        req.files.map((file) => uploadImage(file.buffer))
      );
      res.status(200).json({ data: { url: thumbnails } });
    } else {
      res.status(400).json({ error: "No files were uploaded" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = {
  getWorkouts,
  getWorkoutById,
  updateWorkouts,
  getWorkoutForCurrentMonth,
  checkSubscription,
  imageUrlGenerator,
  updateMonths,
  getVideoUrlfromVimeoId,
  workoutCurrentMonth
};
