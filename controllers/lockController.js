const asyncHandler = require("express-async-handler");
const EditLock = require("../models/editLock");

const LOCK_DURATION_MS = 4 * 1000;

const acquireLock = asyncHandler(async (req, res) => {
  const { resourceType } = req.body;
  const force = req.query.force === "true";
  const userId = req.user._id;
  const userName = req.user.name || [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email

  if (!resourceType) {
    return res.status(400).json({ message: "resourceType is required" });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  const existingLock = await EditLock.findOne({
    resourceType,
    expiresAt: { $gt: now },
  });

  if (!existingLock) {
    await EditLock.findOneAndUpdate(
      { resourceType },
      { userId, userName, lockedAt: now, expiresAt },
      { upsert: true, new: true }
    );
    return res.status(200).json({ locked: false });
  }

  if (existingLock.userId.toString() === userId.toString()) {
    existingLock.lockedAt = now;
    existingLock.expiresAt = expiresAt;
    await existingLock.save();
    return res.status(200).json({ locked: false });
  }

  if (force) {
    existingLock.userId = userId;
    existingLock.userName = userName;
    existingLock.lockedAt = now;
    existingLock.expiresAt = expiresAt;
    await existingLock.save();
    return res.status(200).json({ locked: false, takenOver: true });
  }

  return res.status(200).json({
    locked: true,
    lockedBy: {
      id: existingLock.userId,
      name: existingLock.userName,
    },
  });
});

const heartbeat = asyncHandler(async (req, res) => {
  const { resourceType } = req.body;
  const userId = req.user._id;

  if (!resourceType) {
    return res.status(400).json({ message: "resourceType is required" });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  const lock = await EditLock.findOneAndUpdate(
    { resourceType, userId },
    { lockedAt: now, expiresAt },
    { new: true }
  );

  if (!lock) {
    const currentLock = await EditLock.findOne({
      resourceType,
      expiresAt: { $gt: now },
    });

    return res.status(200).json({
      lockLost: true,
      lockedBy: currentLock ? { id: currentLock.userId, name: currentLock.userName } : null,
    });
  }

  return res.status(200).json({ lockLost: false });
});

const releaseLock = asyncHandler(async (req, res) => {
  const { resourceType } = req.body;
  const userId = req.user._id;

  if (!resourceType) {
    return res.status(400).json({ message: "resourceType is required" });
  }

  await EditLock.deleteOne({ resourceType, userId });

  return res.status(200).json({ released: true });
});

const checkLock = asyncHandler(async (req, res) => {
  const { resourceType } = req.query;
  const userId = req.user._id;

  if (!resourceType) {
    return res.status(400).json({ message: "resourceType is required" });
  }

  const now = new Date();
  const lock = await EditLock.findOne({
    resourceType,
    expiresAt: { $gt: now },
  });

  if (!lock) {
    return res.status(200).json({ locked: false });
  }

  if (lock.userId.toString() === userId.toString()) {
    return res.status(200).json({ locked: false, ownLock: true });
  }

  return res.status(200).json({
    locked: true,
    lockedBy: {
      id: lock.userId,
      name: lock.userName,
    },
  });
});

module.exports = { acquireLock, heartbeat, releaseLock, checkLock };