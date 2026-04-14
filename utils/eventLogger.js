const Event = require("../models/eventModel");
const { resolveUser } = require("./userResolver");
const { extractEventSummary } = require("./eventSummary");
const { getSubscriptionChanges, getSubscriptionActionType } = require("./subscriptionHelpers");

const logEvent = async ({
  userIdentifier,
  source,
  action,
  rawData = {},
  details = "",
  success = true,
  errorMessage = null,
  performedBy = null,
  oldSubscription = null,
  newSubscription = null,
  isNewSubscription = false,
}) => {
  try {
    const user = await resolveUser(userIdentifier);
    
    if (!user) {
      console.log(`[Event Skipped] User not found for identifier:`, userIdentifier, `(type: ${typeof userIdentifier})`);
      return null;
    }

    const summaryData = {
      ...rawData,
      oldSubscription,
      newSubscription,
      performedBy,
      isNewSubscription,
    };

    const summary = extractEventSummary(source, action, summaryData);

    if (!details && isNewSubscription && newSubscription) {
      const formatDateLocal = (dateStr) => {
        if (!dateStr || dateStr === 'none') return 'none';
        try {
          return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        } catch {
          return dateStr;
        }
      };
      const type = newSubscription.subscription_type || 'unknown';
      const price = newSubscription.price || '0';
      const endDate = formatDateLocal(newSubscription.end_date);
      details = `New subscription activated: ${type} (${price}) expires ${endDate}`;
    } else if (!details && (oldSubscription || newSubscription)) {
      details = generateSubscriptionDetails(oldSubscription, newSubscription, source, isNewSubscription);
    }

    const event = await Event.create({
      userId: user._id.toString(),
      source,
      action,
      summary,
      details,
      performedBy: performedBy || `${source} webhook`,
      success,
      errorMessage,
    });

    console.log(`[Event Logged] ${source}:${action} for user ${user.email} (${user._id})`);
    return event;
  } catch (error) {
    console.error("[Event Logger Error]", error.message);
    return null;
  }
};
const generateSubscriptionDetails = (oldSub, newSub, source, isNewSubscription = false) => {
  const formatDateLocal = (dateStr) => {
    if (!dateStr || dateStr === 'none') return 'none';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  if (isNewSubscription) {
    const type = newSub?.subscription_type || 'unknown';
    const price = newSub?.price || '0';
    const endDate = formatDateLocal(newSub?.end_date);
    return `New subscription created: ${type} (${price}) expires ${endDate}`;
  }

  const changes = getSubscriptionChanges(oldSub, newSub);
  
  if (!changes) {
    return null;
  }

  const actionType = getSubscriptionActionType(changes);
  const parts = [];

  switch (actionType) {
    case "new_subscription":
      parts.push(`New subscription activated`);
      break;
    case "cancellation":
      parts.push(`Subscription cancelled`);
      break;
    case "upgrade":
      parts.push(`Subscription upgraded`);
      break;
    case "downgrade":
      parts.push(`Subscription downgraded`);
      break;
    case "renewal":
      parts.push(`Subscription renewed`);
      break;
    default:
      parts.push(`Subscription updated`);
  }

  const changeDetails = [];

  if (changes.type) {
    changeDetails.push(`${changes.type.from || 'none'} >> ${changes.type.to}`);
  }

  if (changes.price) {
    changeDetails.push(`price: ${changes.price.from} >> ${changes.price.to}`);
  }

  if (changes.endDate) {
    const oldDate = formatDateLocal(changes.endDate.from);
    const newDate = formatDateLocal(changes.endDate.to);
    changeDetails.push(`expires: ${oldDate} >> ${newDate}`);
  }

  if (changes.status) {
    changeDetails.push(`status: ${changes.status.from} >> ${changes.status.to}`);
  }

  if (changeDetails.length > 0) {
    parts.push(`(${changeDetails.join(', ')})`);
  }

  return parts.join(' ');
};
const logSubscriptionChange = async ({
  userIdentifier,
  source,
  action,
  oldSubscription,
  newSubscription,
  rawData = {},
  performedBy = null,
  isNewSubscription = false,
}) => {
  const changes = getSubscriptionChanges(oldSubscription, newSubscription);
  const hasChanges = changes && Object.keys(changes).length > 0;

  let details;
  if (isNewSubscription) {
    const formatDateLocal = (dateStr) => {
      if (!dateStr || dateStr === 'none') return 'none';
      try {
        return new Date(dateStr).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return dateStr;
      }
    };
    const type = newSubscription?.subscription_type || 'unknown';
    const price = newSubscription?.price || '0';
    const endDate = formatDateLocal(newSubscription?.end_date);
    details = `New subscription activated: ${type} (${price}) expires ${endDate}`;
  } else if (hasChanges) {
    details = generateSubscriptionDetails(oldSubscription, newSubscription, source, false);
  } else {
    details = `Subscription event received (no data changes)`;
  }

  return await logEvent({
    userIdentifier,
    source,
    action,
    rawData,
    oldSubscription,
    newSubscription,
    details,
    success: true,
    performedBy,
    isNewSubscription,
  });
};
const logErrorEvent = async ({
  userIdentifier,
  source,
  action,
  errorMessage,
  rawData = {},
}) => {
  return await logEvent({
    userIdentifier,
    source,
    action,
    rawData,
    details: errorMessage,
    success: false,
    errorMessage,
  });
};

module.exports = {
  logEvent,
  logSubscriptionChange,
  logErrorEvent,
};