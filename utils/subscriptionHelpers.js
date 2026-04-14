const normalizeSubscription = (subscription) => {
  if (!subscription) return null;

  return {
    status: subscription.user_subscription_status || "free_user",
    type: subscription.subscription_type || "",
    price: subscription.price || "0",
    purchaseDate: subscription.purchase_date || "",
    endDate: subscription.end_date || "",
    updateSource: subscription.update_source || "",
  };
};

const getSubscriptionChanges = (oldSub, newSub) => {
  const old = normalizeSubscription(oldSub);
  const neu = normalizeSubscription(newSub);

  if (!old && !neu) return null;

  const changes = {};

  const oldStatus = old?.status || "free_user";
  const newStatus = neu?.status || "free_user";
  if (oldStatus !== newStatus) {
    changes.status = { from: oldStatus, to: newStatus };
  }

  const oldType = old?.type || "none";
  const newType = neu?.type || "none";
  if (oldType !== newType) {
    changes.type = { from: oldType, to: newType };
  }

  const oldPrice = old?.price || "0";
  const newPrice = neu?.price || "0";
  const oldPriceNum = oldPrice.split(" ")[0];
  const newPriceNum = newPrice.split(" ")[0];
  if (oldPriceNum !== newPriceNum) {
    changes.price = { from: oldPrice, to: newPrice };
  }

  const oldDate = old?.endDate || "none";
  const newDate = neu?.endDate || "none";
  if (oldDate !== newDate) {
    changes.endDate = { from: oldDate, to: newDate };
  }

  const oldSource = old?.updateSource || "none";
  const newSource = neu?.updateSource || "none";
  if (oldSource !== newSource) {
    changes.source = { from: oldSource, to: newSource };
  }

  if (!old && neu) {
    if (!changes.status) {
      changes.status = { from: "free_user", to: neu.status || "free_user" };
    }
    if (!changes.type && neu.type) {
      changes.type = { from: "none", to: neu.type };
    }
    if (!changes.price && neu.price && neu.price !== "0") {
      changes.price = { from: "0", to: neu.price };
    }
    if (!changes.endDate && neu.endDate) {
      changes.endDate = { from: "none", to: neu.endDate };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
};

const getSubscriptionActionType = (changes) => {
  if (!changes) return "no_change";

  const typeRank = { 
    free: 0, 
    trial: 1, 
    weekly: 2, 
    monthly: 3, 
    quarterly: 4, 
    yearly: 5 
  };

  if (changes.status?.from === "free_user" && changes.status?.to === "subscribed_user") {
    return "new_subscription";
  }

  if (changes.status?.from === "subscribed_user" && changes.status?.to === "free_user") {
    return "cancellation";
  }

  if (changes.type) {
    const oldRank = typeRank[changes.type.from] ?? 0;
    const newRank = typeRank[changes.type.to] ?? 0;
    
    if (newRank > oldRank) return "upgrade";
    if (newRank < oldRank) return "downgrade";
  }
  if (changes.endDate && !changes.type) {
    return "renewal";
  }

  return "update";
};

const formatSubscription = (subscription) => {
  const normalized = normalizeSubscription(subscription);
  if (!normalized) return "No subscription";

  if (normalized.status === "free_user") {
    return "Free user";
  }

  return `${normalized.type} subscription (${normalized.price}) - expires ${normalized.endDate}`;
};

module.exports = {
  normalizeSubscription,
  getSubscriptionChanges,
  getSubscriptionActionType,
  formatSubscription,
};