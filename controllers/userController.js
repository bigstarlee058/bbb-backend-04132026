const TempPassword = require('../models/TempPasswordModel');
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const UserDeviceInfo = require("../models/UserDeviceInfoModel");
const UpdatedMonth = require("../models/updatedWorkoutModel");
const Exercise = require("../models/exerciseModel");
const ExerciseHistory = require("../models/exercisehistoryModel");
const Month = require("../models/workoutModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { default: mongoose } = require("mongoose");
const { uploadImage } = require("../utils/files/google/gcs");
const { sendEmail } = require("../utils/emails/init");
const Event = require("../models/eventModel");
const { resolveUser } = require("../utils/userResolver");
const { logSubscriptionChange, logErrorEvent } = require("../utils/eventLogger");
const SECRET_KEY = process.env.WOOCOMMERCE_JWT_AUTH_SECURITY_KEY || "password";
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.TEMP_PASSWORD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);

const IV_LENGTH = 16;

const encryptPassword = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decryptPassword = (encryptedText) => {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

const SUBSCRIPTION_REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

const shouldRefreshSubscriptionInBackground = (user) => {
  const subscription = user?.subscription;
  if (!subscription?.end_date) return false;

  const effectiveEndDate = new Date(
    new Date(subscription.end_date).getTime() + 60 * 60 * 1000
  );

  if (Number.isNaN(effectiveEndDate.getTime()) || new Date() <= effectiveEndDate) {
    return false;
  }

  const lastUpdate = subscription.update_date
    ? new Date(subscription.update_date)
    : null;

  if (!lastUpdate || Number.isNaN(lastUpdate.getTime())) {
    return true;
  }

  return Date.now() - lastUpdate.getTime() > SUBSCRIPTION_REFRESH_COOLDOWN_MS;
};

const refreshExpiredSubscriptionInBackground = async (user) => {
  try {
    let validSubscription = null;

    if (user.singuptype === "web") {
      validSubscription = await checkWP(user.uid);
    } else {
      const rcId = user.rcUserId || user._id.toString();
      validSubscription = await checkRC(rcId);
    }

    const now = new Date();
    const updatedSubscription = validSubscription
      ? {
          ...(user.subscription || {}),
          user_subscription_status: validSubscription.user_subscription_status,
          subscription_type: validSubscription.subscription_type,
          price: validSubscription.price,
          purchase_date: validSubscription.purchase_date,
          end_date: validSubscription.end_date,
          update_source: user.singuptype === "web" ? "wp" : "rc",
          update_date: now,
        }
      : {
          ...(user.subscription || {}),
          user_subscription_status: "free_user",
          subscription_type: "",
          end_date: null,
          update_source: "admin",
          update_date: now,
        };

    await User.updateOne(
      { _id: user._id },
      { $set: { subscription: updatedSubscription } }
    );
  } catch (error) {
    console.error("Background subscription refresh failed:", error);
  }
};

const signupUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email: inputEmail, password } = req.body;
  const email = inputEmail?.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) return res.status(400).json({ message: "Please enter your email" });
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }
  try {
    const existingUser = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    }).lean();
    if (existingUser)
      return res
        .status(400)
        .json({ message: "A user with that email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      uid: -1,
      email,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      singuptype: "mobile",
      experience: "",
      level: 0,
      note: "",
      favorites: [],
      histories: [],
      active: 0,
    });

    await newUser.save();
    return res.status(200).json({ message: "User registered" });
  } catch (err) {
    console.error("Error during signup:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

const registerUser = asyncHandler(async (req, res) => {
  console.log(req.body.email);
  // const { email } = req.body;

  // if (!email) {
  //   return res.status(400).json({ message: "Please add email" });
  // }

  // const auth = getAuth();

  // // Check if user exists
  // const userExists = await User.findOne({ email });
  // if (userExists) {
  //   return res
  //     .status(400)
  //     .json({ message: "A user with that email already exists" });
  // }

  // let credentials;
  // try {
  //   const randomPassword = generateRandomPassword().toString();
  //   console.log("Generated password:", randomPassword);

  //   credentials = await createUserWithEmailAndPassword(
  //     auth,
  //     email,
  //     randomPassword
  //   );

  //   await sendPasswordResetEmail(auth, email); // ensure it runs before response
  // } catch (error) {
  //   console.error("Error creating auth user:", error);
  //   return res
  //     .status(500)
  //     .json({ message: `Error creating user: ${error.message}` });
  // }

  // try {
  //   const newUser = new User({
  //     email,
  //     experience: "",
  //     level: 0,
  //     role: 0,
  //     note: "",
  //     avatarUrl: "",
  //     favorites: [],
  //     histories: [],
  //   });

  //   await newUser.save();
  //   res.status(200).json({ message: "User registered" });
  // } catch (error) {
  //   console.error("Error saving user:", error);
  //   res.status(500).json({ message: "Invalid user data" });
  // }
});

const signInUser = asyncHandler(async (req, res) => {
  const { email: inputEmail, password } = req.body;
  const email = inputEmail?.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
      code: "[jwt auth] invalid_request",
      data: { status: 400 },
    });
  }

  try {
    const user = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    }).lean();
    if (!user) {
      return res.status(403).json({
        message: "Invalid email",
        code: "[jwt auth] invalid_email",
        data: { status: 403 },
      });
    }

    if (!user.password) {
      const response = await fetch(
        `${process.env.WOOCOMMERCE_API_URL}/wp-json/jwt-auth/v1/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            username: email,
            password: password,
          }),
        }
      );
      if (response.status === 200) {
        const data = await response.json();
        return res.status(200).json(data);
      }
    }

    const isPasswordValid = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!isPasswordValid) {
      const temp = await TempPassword.findOne({ userId: user._id });
      if (temp) {
        const decryptedTempPassword = decryptPassword(temp.password);
        const tempValid =
          decryptedTempPassword === password && temp.expiresAt > new Date();
        if (tempValid) {
          const payload = {
            data: {
              user: { userId: user._id, email: user.email, id: user.uid },
            },
          };

          const now = Date.now();
          const expMs = temp.expiresAt.getTime() - now;
          const expSeconds = Math.floor(expMs / 1000);
          const token = jwt.sign(payload, SECRET_KEY, { expiresIn: expSeconds });
          return res.status(200).json({
            message: "Login successful (temporary password)",
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              uid: user.uid,
            },
          });
        }
      }

      return res.status(403).json({
        message: "Invalid password",
        code: "[jwt auth] invalid_password",
        data: { status: 403 },
      });
    }

    const payload = {
      data: {
        user: { userId: user._id, email: user.email, id: user.uid },
      },
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "365d" });
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        uid: user.uid,
      },
    });
  } catch (err) {
    console.error("Apple login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

const getUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const userWorkout = await getWorkoutForCurrentMonthHistory(user.uid);
    user.workout = userWorkout;
    const deviceInfo = await UserDeviceInfo.findOne({ userId: user._id }).lean();

    const userResponse = {
      _id: user._id,
      email: user.email,
      uid: user.uid,
      role: user.role,
      experience: user.experience,
      level: user.level,
      note: user.note,
      avatarUrl: user.avatarUrl,
      favorites: user.favorites,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      singuptype:user.singuptype,
      __v: user.__v,
      name: user.name,
      workoutsHistory: user.workoutsHistory,
      dayHistory: user.dayHistory,
      workout: userWorkout,
      subscription: user.subscription ? user.subscription : { user_subscription_status: "free_user" },
      deviceInfo: deviceInfo || null,
      settings: user.settings
    }
    res.status(200).json(userResponse);

  } catch (error) {
    console.log(error);
  }
});

const getWorkoutForCurrentMonthHistory = async (uid) => {
  try {
    const now = Date.now();

    const workout = await UpdatedMonth.findOne({
      uid,
      $and: [
        { $or: [{ startDate: { $lte: now } }, { startDate: null }] },
        { $or: [{ endDate: { $gte: now } }, { endDate: null }] },
      ],
    }).lean();

    if (!workout) return false;

    const exerciseIds = workout.weeks.flatMap((week) =>
      week.days.flatMap((day) =>
        day.exercises.filter((ex) => ex.exerciseId).map((ex) => ex.exerciseId)
      )
    );

    const exercises = await Exercise.find({ _id: { $in: exerciseIds } }).lean();
    const exerciseMap = Object.fromEntries(
      exercises.map((ex) => [ex._id.toString(), ex.title])
    );

    workout.weeks = await Promise.all(
      workout.weeks.map(async (week) => ({
        ...week,
        days: await Promise.all(
          week.days.map(async (day) => ({
            ...day,
            exercises: day.exercises.map((ex) => ({
              ...ex,
              name: exerciseMap[ex.exerciseId?.toString()] || "",
            })),
          }))
        ),
      }))
    );

    return workout;
  } catch (error) {
    console.error("Error updating workouts:", error);
    return false;
  }
};

const buildSearchQuery = (search) => {
  if (!search) return {};
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    $or: [
      { email:     { $regex: escaped, $options: 'i' } },
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName:  { $regex: escaped, $options: 'i' } },
      { name:      { $regex: escaped, $options: 'i' } },
    ],
  };
};

const buildSortOptions = (sortBy) => {
  const mapping = {
    NameAtoZ:    { name: 1 },
    NameZtoA:    { name: -1 },
    NewestAdded: { createdAt: -1 },
    OldestAdded: { createdAt: 1 },
  };
  return mapping[sortBy] || {};
};

const buildSourceQuery = (source) => {
  if (!source) return {};
  if (source === 'mobile') return { singuptype: 'mobile' };
  if (source === 'wordpress') return { singuptype: 'web' };
  return {};
};

const buildSubscriptionQuery = (subscription) => {
  if (!subscription) return {};
  const now = new Date();
  const query = {};
  const orConditions = [];

  if (subscription === 'free') {
    orConditions.push(
      { subscription: { $exists: false } },
      { 'subscription.user_subscription_status': 'free_user' }
    );
  } else if (['trial', 'week', 'month', 'quarter', 'year'].includes(subscription)) {
    const regexMap = {
      trial:   /trial/i,
      week:    /week/i,
      month:   /month/i,
      quarter: /quarter/i,
      year:    /year/i,
    };

    query['subscription.user_subscription_status'] = 'subscribed_user';
    query['subscription.subscription_type'] = regexMap[subscription];

    orConditions.push(
      { 'subscription.end_date': { $type: 'date', $gt: now } },
      {
        'subscription.end_date': { $type: 'string' },
        $expr: {
          $gt: [
            { $dateFromString: { dateString: '$subscription.end_date', onError: new Date(0) } },
            now,
          ],
        },
      }
    );
  }

  if (orConditions.length > 0) {
    query.$or = orConditions;
  }

  return query;
};

const buildLanguageQuery = (language) => {
  if (!language) return {};
  if (language === 'en') {
    return {
      $or: [
        { 'settings.language': 'en' },
        { 'settings.language': { $exists: false } },
        { 'settings.language': null },
      ],
    };
  }

  return { 'settings.language': language };
};

const mergeQueries = (...queries) => {
  const andClauses = [];
  const merged = {};

  for (const q of queries) {
    if (!q || Object.keys(q).length === 0) continue;
    if (q.$or || q.$and) {
      andClauses.push(q.$or ? { $or: q.$or } : { $and: q.$and });
      const { $or, $and, ...rest } = q;
      Object.assign(merged, rest);
    } else {
      Object.assign(merged, q);
    }
  }

  if (andClauses.length === 1) {
    merged.$or = andClauses[0].$or;
  } else if (andClauses.length > 1) {
    merged.$and = andClauses;
  }

  return merged;
};

const attachDeviceInfo = async (users) => {
  const userIds = users.map((u) => u._id);
  const deviceInfos = await UserDeviceInfo.find({ userId: { $in: userIds } }).lean();
  const deviceInfoMap = Object.fromEntries(
    deviceInfos.map((info) => [info.userId.toString(), info])
  );
  users.forEach((user) => {
    user.deviceInfo = deviceInfoMap[user._id.toString()] || null;
  });
};

const getUsers = asyncHandler(async (req, res) => {
  try {
    const {
      perPage = 10,
      page = 1,
      search,
      sortBy,
      subscription,
      source,
      language,
    } = req.query;

    const limit = Math.min(Number(perPage), 50);
    const skip = (Number(page) - 1) * limit;

    const findQuery = mergeQueries(
      buildSearchQuery(search),
      buildSourceQuery(source),
      buildSubscriptionQuery(subscription),
      buildLanguageQuery(language),
    );

    const sortOptions = buildSortOptions(sortBy);

    const users = await User.find(findQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    await attachDeviceInfo(users);

    const totalCount = await User.countDocuments(findQuery);

    res.json({ users, totalCount });

  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({
      message: 'Server error occurred during user retrieval.',
      error: error.message,
    });
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find()
      .select("uid email name role subscription createdAt")
      .lean();

    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(200).json({ users: [] });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  try {
    let detail = JSON.parse(req.body.detail);

    if (req.files?.[0]?.buffer) {
      detail.avatarUrl = await uploadImage(req.files[0].buffer);
    }

    const updateData = {
      name: `${detail.firstName} ${detail.lastName}`,
      firstName: detail.firstName,
      lastName: detail.lastName,
      detail,
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(200).json({ result: false, message: "User not found" });
    }

    res.status(200).json({ result: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const verifyUser = asyncHandler(async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { active: 1 },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(200).json({ result: false, message: "User not found" });
    }

    res.status(200).json({ result: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const addUserInfo = asyncHandler(async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      birthdate,
      height,
      weight,
      waist,
      hip,
      midthigh,
      bodyfat,
    } = req.body;

    let avatarUrl;
    if (req.files?.[0]?.buffer) {
      avatarUrl = await uploadImage(req.files[0].buffer);
    }

    const updateData = {
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      "detail.sex": gender,
      "detail.dob": birthdate,
      "detail.height": height,
      "detail.weight": weight,
      "detail.waist": waist,
      "detail.hip": hip,
      "detail.midthigh": midthigh,
      "detail.bodyfat": bodyfat,
    };

    if (avatarUrl) updateData["detail.avatarUrl"] = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).lean();

    if (!updatedUser) {
      return res.status(200).json({ result: false, message: "User not found" });
    }

    res.status(200).json({ result: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const updateUserSubscription = asyncHandler(async (req, res) => {
  try {
    const {
      user_subscription_status,
      subscription_type,
      price,
      purchase_date,
      end_date,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        "subscription.user_subscription_status": user_subscription_status,
        "subscription.subscription_type": subscription_type,
        "subscription.price": price,
        "subscription.purchase_date": purchase_date,
        "subscription.end_date": end_date,
      },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(200).json({ result: false, message: "User not found" });
    }

    res.status(200).json({ result: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server error" });
  }
});
const manageUserSubscription = asyncHandler(async (req, res) => {
  try {
    const {
      userId,
      user_subscription_status,
      subscription_type,
      price,
      purchase_date,
      end_date,
      update_source = "admin",
    } = req.body;

    const currentUser = await resolveUser(userId);

    if (!currentUser) {
      await logErrorEvent({
        userIdentifier: userId,
        source: "admin",
        action: "manage_subscription",
        errorMessage: "User not found",
        rawData: req.body,
      });
      return res.status(200).json({ result: false, message: "User not found" });
    }

    const oldSubscription = { ...currentUser.subscription };
    let docToInsert = {
      "subscription.user_subscription_status": user_subscription_status,
      "subscription.subscription_type": subscription_type,
      "subscription.price": price,
      "subscription.purchase_date": purchase_date,
      "subscription.end_date": end_date,
      "subscription.update_source": update_source,
      "subscription.update_date": new Date(),
    }
    if (update_source !== "admin") {
      docToInsert = {
        ...docToInsert,
        singuptype: update_source === "rc" ? "mobile" : "web",
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $set: docToInsert },
      { new: true }
    );

    const typeRank = {
      free: 0,
      trial: 1,
      weekly: 2,
      monthly: 3,
      quarterly: 4,
      yearly: 5,
    };

    const previousType = oldSubscription?.subscription_type || "free";
    const newType = subscription_type || "free";
    const prevRank = typeRank[previousType] ?? 0;
    const newRank = typeRank[newType] ?? 0;

    let adminAction = "manual_update";
    if (newRank > prevRank) adminAction = "upgrade";
    if (newRank < prevRank) adminAction = "downgrade";
    await logSubscriptionChange({
      userIdentifier: updatedUser._id,
      source: "admin",
      action: adminAction,
      oldSubscription,
      newSubscription: updatedUser.subscription,
      rawData: {
        targetUserId: currentUser._id,
        targetEmail: currentUser.email,
        previousValue: previousType,
        newValue: newType,
        reason: req.body.reason || "Manual update",
        performedBy: req.user?.email || req.user?._id || "Unknown admin",
      },
      performedBy: req.user?.email || req.user?._id || "Unknown admin",
    });

    res.status(200).json({ result: true, data: updatedUser });
  } catch (error) {
    console.error(error);
    await logErrorEvent({
      userIdentifier: req.body.userId,
      source: "admin",
      action: "manage_subscription",
      errorMessage: error.message,
      rawData: req.body,
    });
    res.status(200).json({ result: false, message: "Server error" });
  }
});


const deleteUser = asyncHandler(async (req, res) => {
  try {
    const result = await User.findOneAndDelete({ _id: req.params.id }).lean();
    res.status(200).json({ result: !!result });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const signInAdmin = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select("role").lean();

    if (user && user.role >= 1) {
      res.status(200).json({ result: true });
    } else {
      res.status(200).json({ result: false });
    }
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});
const getMe = asyncHandler(async (req, res) => {
  try {
    let user;
    if (req.user._id) {
      user = await User.findById(req.user._id).lean();
    } else {
      user = await User.findOne({ uid: req.user.uid }).lean();
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (shouldRefreshSubscriptionInBackground(user)) {
      setImmediate(() => {
        refreshExpiredSubscriptionInBackground(user).catch((error) => {
          console.error("Subscription refresh scheduling failed:", error);
        });
      });
    }

    const userObj = { ...user, id: user.uid };
    const token = jwt.sign({ data: { user: userObj } }, SECRET_KEY, {
      expiresIn: "365d",
    });
    userObj.token = token;

    res.status(200).json(userObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

const checkRC = async (rcUserId) => {
  try {
    const response = await axios.get(
      `https://api.revenuecat.com/v1/subscribers/${rcUserId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REVENUECAT_API_KEY_V1}`,
          "Content-Type": "application/json",
        },
      }
    );

    const subscriber = response.data?.subscriber;
    if (!subscriber) return null;

    const now = Date.now();
    const subscriptions = Object.values(subscriber.subscriptions || {});

    const activeSubscription = subscriptions
      .filter((s) => {
        if (!s.expires_date || s.refunded_at) return false;
        return new Date(s.expires_date).getTime() > now;
      })
      .sort((a, b) => new Date(b.expires_date).getTime() - new Date(a.expires_date).getTime())[0];

    if (!activeSubscription) return null;

    const productId = (activeSubscription.product_identifier || "").toLowerCase();

    let subscription_type = "monthly";
    if (productId.includes("year") || productId.includes("annual")) {
      subscription_type = "yearly";
    } else if (productId.includes("quarter") || productId.includes("3month")) {
      subscription_type = "quarterly";
    } else if (productId.includes("month")) {
      subscription_type = "monthly";
    } else if (productId.includes("week")) {
      subscription_type = "weekly";
    } else if (productId.includes("trial")) {
      subscription_type = "trial";
    }

    const price = activeSubscription.price?.amount ?? 0;
    const currency = activeSubscription.price?.currency ?? "USD";

    return {
      user_subscription_status: "subscribed_user",
      subscription_type,
      price: `${price} ${currency}`,
      purchase_date: activeSubscription.purchase_date
        ? new Date(activeSubscription.purchase_date).toISOString()
        : "",
      end_date: activeSubscription.expires_date
        ? new Date(activeSubscription.expires_date).toISOString()
        : "",
    };
  } catch (error) {
    console.error("Error checking RC:", error.message);
    return null;
  }
};

const checkWP = async (customerId) => {
  try {
    const [activeResp, pendingResp] = await Promise.all([
      axios.get(
        `${process.env.WOOCOMMERCE_API_URL}/wp-json/wc/v3/subscriptions?customer=${customerId}&status=active`,
        {
          auth: {
            username: process.env.WOOCOMMERCE_CONSUMER_KEY,
            password: process.env.WOOCOMMERCE_CONSUMER_SECRET,
          },
        }
      ),
      axios.get(
        `${process.env.WOOCOMMERCE_API_URL}/wp-json/wc/v3/subscriptions?customer=${customerId}&status=pending-cancel`,
        {
          auth: {
            username: process.env.WOOCOMMERCE_CONSUMER_KEY,
            password: process.env.WOOCOMMERCE_CONSUMER_SECRET,
          },
        }
      ),
    ]);

    const activeData = Array.isArray(activeResp.data) ? activeResp.data : [];
    const pendingData = Array.isArray(pendingResp.data) ? pendingResp.data : [];

    const allSubs = activeData.length ? activeData : pendingData;
    if (!allSubs.length) return null;

    const subscription = allSubs.reduce((latest, current) =>
      new Date(current.date_modified) > new Date(latest.date_modified)
        ? current
        : latest
    );

    const today = new Date();
    const purchase_date = subscription?.start_date_gmt
      ? new Date(subscription.start_date_gmt + "Z").toISOString()
      : today.toISOString();

    let end_date = subscription?.next_payment_date_gmt || subscription?.end_date_gmt;
    end_date = end_date ? new Date(end_date + "Z").toISOString() : today.toISOString();

    let price = "0";
    let subscription_type = "";
    const currency = subscription?.currency || "USD";
    const enSubscriptions = {
      "70": "monthly",
      "71": "yearly",
      "54737": "quarterly",
    };
    const esSubscriptions = {
      "78398": "quarterly",
      "78400": "monthly",
      "78401": "yearly",
    };

    const allSubscriptions = { ...enSubscriptions, ...esSubscriptions };

    if (subscription?.line_items?.length) {
      for (const item of subscription.line_items) {
        const plan = allSubscriptions[item.variation_id?.toString()];
        if (plan) {
          subscription_type = plan;
          price = `${item?.subtotal || 0}`;
        }
      }
    }

    if (!subscription_type) return null;

    return {
      user_subscription_status: "subscribed_user",
      subscription_type,
      price: `${price} ${currency}`,
      purchase_date,
      end_date,
    };
  } catch (error) {
    console.error("Error checking WP:", error.message);
    return null;
  }
};

const exerciseDone = asyncHandler(async (req, res) => {
  try {
    const { monthIndex, weekIndex, dayId, exerciseId, exercises, day } =
      req.body;

    const update = {
      $push: {
        workoutsHistory: {
          monthIndex,
          weekIndex,
          dayId: new mongoose.Types.ObjectId(dayId),
          exerciseId: new mongoose.Types.ObjectId(exerciseId),
          exercises,
          day,
        },
      },
    };

    const result = await User.updateOne({ _id: req.user._id }, update).lean();

    if (result.modifiedCount === 0) {
      return res
        .status(200)
        .json({ result: false, message: "User not found or no changes made" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.log(error);
  }
});
const updateSettings = asyncHandler(async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ message: "Invalid settings data" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.settings = { ...user.settings, ...settings };
    await user.save();
    res
      .status(200)
      .json({ message: "Settings updated", settings: user.settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

const updateDeviceInfo = asyncHandler(async (req, res) => {
  try {
    const { device, systemName, osVersion, appVersion } = req.body;
    if (!systemName || !appVersion) {
      return res.status(400).json({
        message: "systemName and appVersion are required"
      });
    }
    const userId = req.user._id;

    let deviceInfo = await UserDeviceInfo.findOne({ userId });

    if (deviceInfo) {
      if (device !== undefined) deviceInfo.device = device;
      if (systemName !== undefined) deviceInfo.systemName = systemName;
      if (osVersion !== undefined) deviceInfo.osVersion = osVersion;
      if (appVersion !== undefined) deviceInfo.appVersion = appVersion;
      await deviceInfo.save();
    } else {
      deviceInfo = await UserDeviceInfo.create({
        userId,
        device,
        systemName,
        osVersion,
        appVersion,
        lastLogin: Date.now()
      });
    }

    res.status(200).json({
      message: "Device information updated",
      deviceInfo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});
const dayDone = asyncHandler(async (req, res) => {
  try {
    const { monthIndex, weekIndex, daySplit, dayIndex, state, streak } =
      req.body;

    const duplicateCheck = await User.findOne({
      _id: req.user._id,
      dayHistory: {
        $elemMatch: {
          monthIndex: parseInt(monthIndex, 10),
          weekIndex: parseInt(weekIndex, 10),
          dayIndex: parseInt(dayIndex, 10),
          daySplit: parseInt(daySplit, 10),
        },
      },
    }).lean();

    if (duplicateCheck) {
      return res
        .status(200)
        .json({ result: false, message: "Entry already exists" });
    }

    const update = {
      $push: {
        dayHistory: {
          monthIndex: parseInt(monthIndex, 10),
          weekIndex: parseInt(weekIndex, 10),
          daySplit: parseInt(daySplit, 10),
          dayIndex: parseInt(dayIndex, 10),
          state,
          streak: parseInt(streak, 10),
        },
      },
    };

    const result = await User.updateOne({ _id: req.user._id }, update).lean();

    if (result.modifiedCount === 0) {
      return res
        .status(200)
        .json({ result: false, message: "User not found or no changes made" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const getWorkoutsHistory = asyncHandler(async (req, res) => {
  try {
    const { monthIndex, weekIndex, dayIndex, day, daySplit, exercises } =
      req.body;

    const workoutPush = {
      monthIndex,
      weekIndex,
      dayIndex,
      daySplit,
      day,
    };

    const exercisesPush = exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      status: exercise.status,
    }));

    const result = await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          workoutsHistory: workoutPush,
          "workoutsHistory.$[].exercises": { $each: exercisesPush },
        },
      }
    ).lean();

    if (result.modifiedCount === 0) {
      return res
        .status(200)
        .json({ result: false, message: "User not found or no changes made" });
    }

    res.status(200).json({ result: true });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const getUserWorkoutsHistory = asyncHandler(async (req, res) => {
  try {
    const idList_3 = [
      "Day 1 Workout",
      "Rest Day 1",
      "Day 2 Workout",
      "Rest Day 2",
      "Day 3 Workout",
      "Rest Day 3",
      "Rest Day 4",
    ];
    const idList_4 = [
      "Day 1 Workout",
      "Day 2 Workout",
      "Rest Day 1",
      "Day 3 Workout",
      "Day 4 Workout",
      "Rest Day 2",
      "Rest Day 3",
    ];
    const idList_5 = [
      "Day 1 Workout",
      "Day 2 Workout",
      "Day 3 Workout",
      "Day 4 Workout",
      "Day 5 Workout",
      "Rest Day 1",
      "Rest Day 2",
    ];

    const [exerciseHistories, workouts, exercisesTitle] = await Promise.all([
      ExerciseHistory.find({ userId: req.params.id }).lean(),
      Month.find().lean(),
      Exercise.find({}, { title: 1 }).lean(),
    ]);

    const workoutMap = new Map(workouts.map((m) => [m._id.toString(), m]));
    const exerciseMap = new Map(
      exercisesTitle.map((ex) => [ex._id.toString(), ex.title])
    );

    const enrichedHistory = exerciseHistories.map((history) => {
      const month = workoutMap.get(history.monthId);
      if (!month)
        return {
          ...history,
          monthTitle: null,
          monthIndex: null,
          weekIndex: null,
          weekTitle: null,
        };

      const week = month.weeks.find((w) => w._id.toString() === history.weekId);
      const exerciseTitle =
        exerciseMap.get(history.exerciseId?.toString()) || null;

      let dayIndex = 0;
      if (history.split === "split3")
        dayIndex = idList_3.findIndex((text) => history.dayId.includes(text));
      else if (history.split === "split4")
        dayIndex = idList_4.findIndex((text) => history.dayId.includes(text));
      else if (history.split === "split5")
        dayIndex = idList_5.findIndex((text) => history.dayId.includes(text));

      return {
        monthTitle: month.title,
        monthIndex: month.index,
        weekTitle: week?.title || null,
        weekIndex: week?.index || null,
        dayIndex: dayIndex + 1,
        exerciseTitle,
        split: history.split,
        date: history.date,
        status: history.status,
        sets: history.sets,
        reps: history.reps,
        weight: history.weight,
        rest: history.rest,
        load: history.load,
        effort: history.effort,
        totalSet: history.totalSet,
      };
    });

    res.status(200).json(enrichedHistory);
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server Error" });
  }
});

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const normalizedEmail = email?.trim().toLowerCase() || '';
    const user = await User.findOne({ email: normalizedEmail }).lean();
    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.password) {
      try {
        const url = `${process.env.WOOCOMMERCE_API_URL}/wp-json/custom/v1/send-password-reset`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        const data = await response.json();
        return res.status(response.ok ? 200 : response.status).json({
          message: response.ok
            ? data.message
            : "Failed to send password reset request.",
        });
      } catch (error) {
        return res.status(500).json({
          message: "Error sending password reset request.",
          error: error.message,
        });
      }
    }
    const token = jwt.sign({ id: user._id }, process.env.RESET_PASSWORD_KEY, {
      expiresIn: "10m",
    });
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: Date.now() + 600000,
        },
      }
    )
      .lean()
      .exec();
    const resetUrl = `${process.env.SERVER_URL}/api/users/forgot_password_form/${token}`;
    const emailData = {
      to: user.email,
      from: process.env.SENDGRID_EMAIL,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background: #fafafa;">
          <h2 style="color: #2c3e50;">Hello ${user.email},</h2>
          <p>You requested a password reset for your account.</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </p>
          <p style="color: #555;">You need to reset your password within <strong>10 minutes</strong>.</p>
          <p>If you didn’t request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #888;">Thank you,<br/>The Support Team</p>
        </div>
      `,
    };

    sendEmail(emailData);
    res.status(200).json({
      message: "Password reset link sent. The link is valid for 10 mins",
    });
    // .then(() => {
    //   res
    //     .status(200)
    //     .json({
    //       message: "Password reset link sent. The link is valid for 10 mins",
    //       token,
    //     });
    // })
    // .catch((err) => {
    //   res
    //     .status(500)
    //     .json({ message: "Error sending email", error: err.message });
    // });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const renderResetPasswordPage = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_KEY);

    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).lean();

    if (!user) {
      return res.status(200).json({
        result: false,
        message: "Password reset token is invalid or expired.",
      });
    }

    res.send(`
      <body style="margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#f6f7fb; color:#111;">
        <div style="min-height:100svh; display:flex; align-items:center; justify-content:center; padding:24px;">
          <div style="width:100%; max-width:420px; background:#fff; border:1px solid #e7e9ee; border-radius:16px; box-shadow:0 10px 30px rgba(16,24,40,0.06); padding:28px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
              <div aria-hidden="true" style="width:36px; height:36px; border-radius:10px; background:#111; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700;">🔒</div>
              <h1 style="margin:0; font-size:20px; line-height:1.2;">Reset your password</h1>
            </div>
            <p style="margin:0 0 22px 0; font-size:14px; color:#475467;">
              Enter your new password, and the confirmation to update your account.
            </p>

            <form method="POST" action="${process.env.SERVER_URL}/api/users/reset_password" style="display:block; margin:0;">
              <!-- If you have a server-issued token, populate this hidden field -->
              <input type="hidden" name="token" value="${token}" />

              <label for="password" style="display:block; font-size:13px; font-weight:600; color:#344054; margin:8px 0 6px;">New password</label>
              <div style="position:relative; margin:0 0 12px;">
                <input
                  id="password"
                  name="password"
                  type="password"
                  minlength="8"
                  required
                  placeholder="At least 8 characters"
                  style="width:100%; box-sizing:border-box; border:1px solid #d0d5dd; border-radius:10px; padding:12px 44px 12px 14px; font-size:14px; outline:none; transition:border .2s, box-shadow .2s;"
                  onfocus="this.style.border='#7f56d9'; this.style.boxShadow='0 0 0 4px rgba(127,86,217,.14)';"
                  onblur="this.style.border='#d0d5dd'; this.style.boxShadow='none';"
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onclick="const p=document.getElementById('password'); p.type = p.type==='password' ? 'text' : 'password'; this.textContent = p.type==='password' ? 'Show' : 'Hide';"
                  style="position:absolute; right:8px; top:50%; transform:translateY(-50%); border:none; background:#f2f4f7; color:#344054; font-size:12px; padding:6px 10px; border-radius:8px; cursor:pointer;"
                >Show</button>
              </div>

              <label for="confirmPassword" style="display:block; font-size:13px; font-weight:600; color:#344054; margin:8px 0 6px;">Confirm password</label>
              <div style="position:relative; margin:0 0 6px;">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minlength="8"
                  required
                  placeholder="Re-enter your new password"
                  style="width:100%; box-sizing:border-box; border:1px solid #d0d5dd; border-radius:10px; padding:12px 44px 12px 14px; font-size:14px; outline:none; transition:border .2s, box-shadow .2s;"
                  onfocus="this.style.border='#7f56d9'; this.style.boxShadow='0 0 0 4px rgba(127,86,217,.14)';"
                  onblur="this.style.border='#d0d5dd'; this.style.boxShadow='none';"
                />
                <button
                  type="button"
                  aria-label="Toggle confirm password visibility"
                  onclick="const c=document.getElementById('confirmPassword'); c.type = c.type==='password' ? 'text' : 'password'; this.textContent = c.type==='password' ? 'Show' : 'Hide';"
                  style="position:absolute; right:8px; top:50%; transform:translateY(-50%); border:none; background:#f2f4f7; color:#344054; font-size:12px; padding:6px 10px; border-radius:8px; cursor:pointer;"
                >Show</button>
              </div>

              <div id="error" role="alert" style="display:none; margin:6px 0 10px; font-size:13px; color:#b42318; background:#fef3f2; border:1px solid #fecdca; border-radius:10px; padding:10px 12px;">
                Passwords do not match.
              </div>

              <button
                type="submit"
                style="width:100%; border:none; background:#7f56d9; color:#fff; font-weight:600; font-size:14px; padding:12px 16px; border-radius:10px; cursor:pointer; margin-top:10px; box-shadow:0 6px 16px rgba(127,86,217,.25);"
                onmousedown="this.style.transform='translateY(1px)';"
                onmouseup="this.style.transform='none';"
                onmouseover="this.style.filter='brightness(1.03)';"
                onmouseout="this.style.filter='none';"
              >
                Reset password
              </button>
            </form>
          </div>
        </div>
      </body>
    `);
  } catch (err) {
    console.error(err);
    res
      .status(200)
      .json({ result: false, message: "Invalid or expired token." });
  }
};

const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res
      .status(200)
      .json({ result: false, message: "Passwords do not match." });
  }

  try {
    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_KEY);

    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).lean();

    if (!user) {
      return res.status(200).json({
        result: false,
        message: "Password reset token is invalid or expired.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await User.updateOne(
      { _id: decoded.id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(200)
        .json({ result: false, message: "Failed to reset password." });
    }

    res
      .status(200)
      .json({ result: true, message: "Password has been reset successfully." });
  } catch (err) {
    console.error(err);
    res.status(200).json({ result: false, message: "Something went wrong." });
  }
};

const UpdateAppVersion = asyncHandler(async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) {
      return res.status(400).json({ message: "Version is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.appVersion = version;
    await user.save();
    res.status(200).json({ message: "App version updated", version });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});
const getSubscriptionStats = asyncHandler(async (req, res) => {
  try {
    const { filterType, date, startDate, endDate } = req.query;
    const now = new Date();

    let queryStartDate;
    let queryEndDate = now;
    let intervalType = 'day';

    switch (filterType) {
      case 'today': {
        queryStartDate = new Date(now);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate = new Date(now);
        queryEndDate.setHours(23, 59, 59, 999);
        intervalType = 'hour';
        break;
      }

      case 'currentWeek': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        queryStartDate = startOfWeek;
        queryEndDate = new Date(now);
        queryEndDate.setHours(23, 59, 59, 999);
        intervalType = 'day';
        break;
      }

      case 'currentMonth': {
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        queryEndDate = new Date(now);
        queryEndDate.setHours(23, 59, 59, 999);
        intervalType = 'day';
        break;
      }

      case 'lastMonth': {
        queryStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        intervalType = 'day';
        break;
      }

      case 'currentYear': {
        queryStartDate = new Date(now.getFullYear(), 0, 1);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate = new Date(now);
        queryEndDate.setHours(23, 59, 59, 999);
        intervalType = 'month';
        break;
      }

      case 'lastYear': {
        queryStartDate = new Date(now.getFullYear() - 1, 0, 1);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        intervalType = 'month';
        break;
      }

      case 'allTime': {
        const firstUser = await User.findOne().sort({ createdAt: 1 }).lean();
        queryStartDate = firstUser ? new Date(firstUser.createdAt) : new Date(now.getFullYear(), 0, 1);
        queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        queryEndDate.setHours(23, 59, 59, 999);
        intervalType = 'month';
        break;
      }

      case 'date': {
        if (date) {
          queryStartDate = new Date(date + 'T00:00:00');
          queryEndDate = new Date(date + 'T23:59:59.999');
          intervalType = 'hour';
        }
        break;
      }

      case 'dateRange': {
        if (startDate && endDate) {
          queryStartDate = new Date(startDate + 'T00:00:00');
          queryEndDate = new Date(endDate + 'T23:59:59.999');

          const diffTime = Math.abs(queryEndDate - queryStartDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 1) intervalType = 'hour';
          else if (diffDays <= 31) intervalType = 'day';
          else if (diffDays <= 180) intervalType = 'week';
          else intervalType = 'month';
        }
        break;
      }

      default: {
        queryStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        queryStartDate.setHours(0, 0, 0, 0);
        queryEndDate = new Date(now);
        queryEndDate.setHours(23, 59, 59, 999);
        intervalType = 'day';
      }
    }

    const toLocalDateString = (date) => {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const getIntervalKey = (date, type) => {
      const d = new Date(date);
      switch (type) {
        case 'hour':
          return `${toLocalDateString(d)} ${String(d.getHours()).padStart(2, '0')}:00`;
        case 'day':
          return toLocalDateString(d);
        case 'week': {
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          return toLocalDateString(weekStart);
        }
        case 'month':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        default:
          return toLocalDateString(d);
      }
    };

    const getIntervalEndTime = (key, type) => {
      switch (type) {
        case 'hour': {
          const [dateStr, hourStr] = key.split(' ');
          const hour = parseInt(hourStr.split(':')[0]);
          const d = new Date(dateStr + 'T00:00:00');
          d.setHours(hour, 59, 59, 999);
          return d;
        }
        case 'day':
          return new Date(key + 'T23:59:59.999');
        case 'week': {
          const [y, m, d] = key.split('-').map(Number);
          const wd = new Date(y, m - 1, d);
          wd.setDate(wd.getDate() + 6);
          wd.setHours(23, 59, 59, 999);
          return wd;
        }
        case 'month': {
          const [y, m] = key.split('-').map(Number);
          return new Date(y, m, 0, 23, 59, 59, 999);
        }
        default:
          return new Date(key);
      }
    };

    const intervals = [];
    let current = new Date(queryStartDate);
    while (current <= queryEndDate) {
      const key = getIntervalKey(current, intervalType);
      if (!intervals.find((i) => i.key === key)) {
        intervals.push({ key, endTime: getIntervalEndTime(key, intervalType) });
      }

      switch (intervalType) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    intervals.sort((a, b) => a.endTime - b.endTime);

    const allUsers = await User.find({
      createdAt: { $lte: queryEndDate },
    }).lean();

    const initialCounts = { free: 0, monthly: 0, quarterly: 0, yearly: 0 };

    allUsers.forEach((user) => {
      const sub = user.subscription || {};
      const createdAt = new Date(user.createdAt);
      const subType = sub.subscription_type || '';
      const status = sub.user_subscription_status || 'free_user';

      if (createdAt < queryStartDate) {
        if (status === 'free_user' || /free/i.test(subType)) {
          initialCounts.free++;
        } else if (/quarter/i.test(subType)) {
          initialCounts.quarterly++;
        } else if (/month/i.test(subType)) {
          initialCounts.monthly++;
        } else if (/year/i.test(subType)) {
          initialCounts.yearly++;
        } else {
          initialCounts.free++;
        }
      }
    });

    const intervalChanges = {};
    intervals.forEach((interval, idx) => {
      intervalChanges[interval.key] = { free: 0, monthly: 0, quarterly: 0, yearly: 0 };

      const intervalStart = idx === 0
        ? queryStartDate
        : new Date(intervals[idx - 1].endTime.getTime() + 1);
      const intervalEnd = interval.endTime;

      allUsers.forEach((user) => {
        const sub = user.subscription || {};
        const createdAt = new Date(user.createdAt);
        const subType = sub.subscription_type || '';
        const status = sub.user_subscription_status || 'free_user';

        if (createdAt >= intervalStart && createdAt <= intervalEnd) {
          if (status === 'free_user' || /free/i.test(subType)) {
            intervalChanges[interval.key].free++;
          } else if (/month/i.test(subType)) {
            intervalChanges[interval.key].monthly++;
          } else if (/year/i.test(subType)) {
            intervalChanges[interval.key].yearly++;
          } else if (/quarter/i.test(subType)) {
            intervalChanges[interval.key].quarterly++;
          } else {
            intervalChanges[interval.key].free++;
          }
        }
      });
    });
    const growthFree = [];
    const growthMonthly = [];
    const growthQuarterly = [];
    const growthYearly = [];
    const growthPaid = [];
    const growthTotals = [];
    const sortedKeys = intervals.map((i) => i.key);
    sortedKeys.forEach((key) => {
      const freeDelta = intervalChanges[key].free;
      const monthlyDelta = intervalChanges[key].monthly;
      const yearlyDelta = intervalChanges[key].yearly;
      const quarterlyDelta = intervalChanges[key].quarterly;
      const paidDelta = monthlyDelta + quarterlyDelta + yearlyDelta;
      const totalDelta = freeDelta + paidDelta;

      growthFree.push(freeDelta);
      growthMonthly.push(monthlyDelta);
      growthYearly.push(yearlyDelta);
      growthPaid.push(paidDelta);
      growthTotals.push(totalDelta);
      growthQuarterly.push(quarterlyDelta);
    });

    const freeArray = [];
    const monthlyArray = [];
    const quarterlyArray = [];
    const yearlyArray = [];
    const paidArray = [];
    const totalsArray = [];

    let cumulativeFree = initialCounts.free;
    let cumulativeMonthly = initialCounts.monthly;
    let cumulativeQuarterly = initialCounts.quarterly;
    let cumulativeYearly = initialCounts.yearly;

    sortedKeys.forEach((key) => {
      cumulativeFree += intervalChanges[key].free;
      cumulativeMonthly += intervalChanges[key].monthly;
      cumulativeQuarterly += intervalChanges[key].quarterly;
      cumulativeYearly += intervalChanges[key].yearly;

      freeArray.push(cumulativeFree);
      monthlyArray.push(cumulativeMonthly);
      yearlyArray.push(cumulativeYearly);
      quarterlyArray.push(cumulativeQuarterly);
      paidArray.push(cumulativeMonthly + cumulativeQuarterly + cumulativeYearly);
      totalsArray.push(cumulativeFree + cumulativeMonthly + cumulativeQuarterly + cumulativeYearly);
    });

    const formatLabel = (key, type) => {
      switch (type) {
        case 'hour':
          return key.split(' ')[1];
        case 'day': {
          const [y, m, d] = key.split('-').map(Number);
          return `${m}/${d}/${y}`;
        }
        case 'week': {
          const [y, m, d] = key.split('-').map(Number);
          return `${m}/${d}/${y}`;
        }
        case 'month': {
          const [y, m] = key.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${months[parseInt(m) - 1]} ${y}`;
        }
        default:
          return key;
      }
    };

    const response = {
      dates: sortedKeys.map((key) => formatLabel(key, intervalType)),
      free: freeArray,
      monthly: monthlyArray,
      quarterly: quarterlyArray,
      yearly: yearlyArray,
      paid: paidArray,
      totals: totalsArray,
      intervalType,
      growth: {
        free: growthFree,
        monthly: growthMonthly,
        quarterly: growthQuarterly,
        yearly: growthYearly,
        paid: growthPaid,
        totals: growthTotals
      },
    };

    return res.json({ data: response });
  } catch (error) {
    console.error('getSubscriptionStats error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

const resetUserPasswordByAdmin = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.uid === -1) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await User.updateOne(
        { _id: id },
        { $set: { password: hashedPassword } }
      );
      if (result.modifiedCount === 0) {
        return res.status(500).json({
          message: "Failed to update password"
        });
      }

      return res.status(200).json({
        message: "Password reset successfully for mobile user"
      });
    }

    if (user.uid && user.uid !== -1) {
      const url = `${process.env.WOOCOMMERCE_API_URL}/wp-json/wc/v3/customers/${user.uid}`;
      const auth = Buffer.from(
        `${process.env.WOOCOMMERCE_CONSUMER_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`
      ).toString('base64');
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(400).json({
          message: errorData.message || "Failed to update WordPress user password",
          error: errorData
        });
      }

      const data = await response.json();
      return res.status(200).json({
        message: "Password reset successfully for WordPress user",
        data
      });
    }
    return res.status(400).json({
      message: "Invalid user type Cannot determine if mobile or WordPress user."
    });

  } catch (error) {
    console.error("resetUserPasswordByAdmin error:", error);
    return res.status(500).json({
      message: error.message || "Server error"
    });
  }
});

const fetchFromWordPress = async (customerId) => {
  const response = await axios.get(
    `${process.env.WOOCOMMERCE_API_URL}/wp-json/wc/v3/subscriptions?`,
    {
      params: { customer: customerId },
      auth: {
        username: process.env.WOOCOMMERCE_CONSUMER_KEY,
        password: process.env.WOOCOMMERCE_CONSUMER_SECRET,
      },
    }
  );
  return response.data;
};

const checkRevenueCatUserExists = async (userId) => {
  try {
    await axios.get(
      `https://api.revenuecat.com/v2/projects/${process.env.REVENUECAT_PROJECT_ID}/customers/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REVENUECAT_API_KEY_V2}`,
          "Content-Type": "application/json",
        },
      }
    );
    return true;
  } catch (error) {
    if (error?.response?.status === 404) return false;
    throw error;
  }
};

const fetchRevenueCatSubscription = async (userId) => {
  const response = await axios.get(
    `https://api.revenuecat.com/v1/subscribers/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.REVENUECAT_API_KEY_V1}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
const fetchFromRevenueCat = async (userId) => {
  if (userId.startsWith("$RCAnonymousID")) {
    const data = await fetchRevenueCatSubscription(userId);
    return { userExists: true, data };
  }
  const userExists = await checkRevenueCatUserExists(userId);

  if (!userExists) {
    return { userExists: false, data: null };
  }

  const data = await fetchRevenueCatSubscription(userId);
  return { userExists: true, data };
};
const getSubscription = asyncHandler(async (req, res) => {
  const { userId, source } = req.query;

  if (!userId || !source) {
    return res.status(400).json({
      message: "userId and source are required",
    });
  }

  if (source === "wp") {
    const data = await fetchFromWordPress(userId);
    return res.json({ source: "wp", data });
  }
  if (source === "rc") {
    const data = await fetchFromRevenueCat(userId);
    return res.json({ source: "rc", data });
  }

  return res.status(400).json({
    message: "Invalid source. Use wp or rc",
  });
});
const generateTempPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  const password = Math.floor(10000000 + Math.random() * 90000000).toString();
  const encryptedPassword = encryptPassword(password);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await TempPassword.findOneAndUpdate(
    { userId: user._id },
    { password: encryptedPassword, expiresAt, createdAt: new Date() },
    { upsert: true }
  );
  res.status(200).json({ data: { tempPassword: password, expiresAt } });
});
const getTempPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const temp = await TempPassword.findOne({
    userId: id,
    expiresAt: { $gt: new Date() }
  }).lean();

  if (!temp) {
    return res.status(200).json({
      data: {
        tempPassword: "",
        expiresAt: ""
      }
    });
  }

  const decryptedPassword = decryptPassword(temp.password);

  if (!decryptedPassword) {
    return res.status(200).json({
      data: {
        tempPassword: "",
        expiresAt: ""
      }
    });
  }

  return res.status(200).json({
    data: {
      tempPassword: decryptedPassword,
      expiresAt: temp.expiresAt
    }
  });
});
const getUserEvents = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { source, action, page = 1, perPage = 20 } = req.query;

    const query = { userId: id };

    if (source) {
      query.source = source;
    }

    if (action) {
      query.action = action;
    }

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage))
      .lean();

    res.status(200).json({
      data: {
        result: true,
        events,
        total,
        page: parseInt(page),
        perPage: parseInt(perPage),
      }
    });
  } catch (error) {
    console.error(error);
    res.status(200).json({ result: false, message: "Server error" });
  }
});
module.exports = {
  signupUser,
  registerUser,
  getUser,
  getUsers,
  getAllUsers,
  updateUser,
  addUserInfo,
  updateUserSubscription,
  deleteUser,
  signInAdmin,
  getMe,
  exerciseDone,
  dayDone,
  getWorkoutsHistory,
  getUserWorkoutsHistory,
  signInUser,
  verifyUser,
  forgotPassword,
  resetPassword,
  renderResetPasswordPage,
  UpdateAppVersion,
  updateSettings,
  manageUserSubscription,
  updateDeviceInfo,
  getSubscriptionStats,
  resetUserPasswordByAdmin,
  getSubscription,
  generateTempPassword,
  getTempPassword,
  getUserEvents
};
