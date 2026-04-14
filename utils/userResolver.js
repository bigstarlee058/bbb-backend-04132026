const User = require("../models/userModel");
const mongoose = require("mongoose");

const resolveUser = async (identifier) => {
  if (!identifier) return null;

  try {
    if (typeof identifier === "object" && !mongoose.Types.ObjectId.isValid(identifier)) {
      const { id, customer_id, email, app_user_id, _id } = identifier;
      const searchId = _id || id || customer_id || app_user_id;
      const searchEmail = email?.trim().toLowerCase();

      if (searchId) {
        const result = await resolveUser(searchId);
        if (result) return result;
      }
      if (searchEmail) {
        const result = await resolveUser(searchEmail);
        if (result) return result;
      }
      return null;
    }

    let id = identifier;
    if (identifier instanceof mongoose.Types.ObjectId) {
      id = identifier.toString();
    } else if (typeof identifier === 'number') {
      id = identifier.toString();
    } else {
      id = String(identifier);
    }

    if (id.startsWith("$RCAnonymousID")) {
      const user = await User.findOne({ rcUserId: id });
      if (user) return user;
    }

    if (mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
      const userById = await User.findById(id);
      if (userById) return userById;
    }

    if (id.includes("@")) {
      const user = await User.findOne({ email: id.trim().toLowerCase() });
      if (user) return user;
    }

    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      const userByUid = await User.findOne({ uid: numericId });
      if (userByUid) return userByUid;
    }

    const userByRcId = await User.findOne({ rcUserId: id });
    if (userByRcId) return userByRcId;

    return null;
  } catch (error) {
    console.error("Error resolving user:", error.message);
    return null;
  }
};

const resolveUserId = async (identifier) => {
  const user = await resolveUser(identifier);
  return user ? user._id.toString() : null;
};

module.exports = {
  resolveUser,
  resolveUserId,
};