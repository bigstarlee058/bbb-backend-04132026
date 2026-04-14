const { getSubscriptionChanges, getSubscriptionActionType } = require("./subscriptionHelpers");

const extractEventSummary = (source, action, data) => {
  const summary = {
    source,
    action,
    timestamp: new Date().toISOString(),
  };

  try {
    switch (source) {
      case "rc":
        return extractRevenueCatSummary(action, data, summary);
      case "wp":
        return extractWooCommerceSummary(action, data, summary);
      case "admin":
        return extractAdminSummary(action, data, summary);
      default:
        return { ...summary, data: "Unknown source" };
    }
  } catch (error) {
    console.error("Error extracting event summary:", error);
    return { ...summary, error: error.message };
  }
};


const extractRevenueCatSummary = (action, data, baseSummary) => {
  const event = data?.event || {};
  const subscriber = data?.subscriber || event;

  const summary = {
    ...baseSummary,
    eventType: action,
    appUserId: event.app_user_id || subscriber.app_user_id,
    email: subscriber.subscriber_attributes?.$email?.value || 
           event.subscriber_attributes?.$email?.value || 
           "unknown",
  };

  if (event.product_id) {
    summary.productId = event.product_id;
  }

  if (event.price || event.price_in_purchased_currency) {
    summary.price = event.price_in_purchased_currency || event.price;
    summary.currency = event.currency || "USD";
  }
  if (data.oldSubscription && data.newSubscription) {
    const changes = getSubscriptionChanges(data.oldSubscription, data.newSubscription);
    if (changes) {
      summary.changes = changes;
      summary.actionType = getSubscriptionActionType(changes);
    }
  }

  if (event.period_type) {
    summary.periodType = event.period_type;
  }

  if (event.store || subscriber.store) {
    summary.store = event.store || subscriber.store;
  }

  return summary;
};

const extractWooCommerceSummary = (action, data, baseSummary) => {
  const summary = {
    ...baseSummary,
    eventType: action,
    wpUserId: data.id || data.customer_id,
    email: data.email || "unknown",
  };

  if (action.includes("customer")) {
    summary.firstName = data.first_name;
    summary.lastName = data.last_name;
    summary.role = data.role;

    if (data.meta_data) {
      const emailChanged = data.meta_data.find(m => m.key === "email_changed");
      if (emailChanged) {
        summary.emailChanged = {
          from: emailChanged.old_value,
          to: emailChanged.new_value,
        };
      }
    }
  }

  if (action.includes("subscription") || action.includes("order") || action === "subscription.activated") {
    summary.subscriptionId = data.id;
    summary.status = data.status;
    summary.total = data.total;
    summary.currency = data.currency;

    if (data.line_items?.length) {
      summary.products = data.line_items.map(item => ({
        name: item.name,
        variationId: item.variation_id,
        subtotal: item.subtotal,
      }));
    }
  }

  if (data.isNewSubscription && data.newSubscription) {
    summary.changes = {
      type: { from: "none", to: data.newSubscription.subscription_type || "none" },
      price: { from: "0", to: data.newSubscription.price || "0" },
      status: { from: "free_user", to: data.newSubscription.user_subscription_status || "subscribed_user" },
      endDate: { from: "none", to: data.newSubscription.end_date || "none" },
    };
    summary.actionType = "new_subscription";
  } else if (data.oldSubscription || data.newSubscription) {
    const changes = getSubscriptionChanges(data.oldSubscription, data.newSubscription);
    if (changes && Object.keys(changes).length > 0) {
      summary.changes = changes;
      summary.actionType = getSubscriptionActionType(changes);
    } else {
      summary.currentSubscription = {
        type: data.newSubscription?.subscription_type || data.newSubscription?.user_subscription_status || "unknown",
        price: data.newSubscription?.price || "0",
        status: data.newSubscription?.user_subscription_status || "unknown",
        endDate: data.newSubscription?.end_date || "none",
      };
      summary.actionType = "no_change";
    }
  }

  return summary;
};

const extractAdminSummary = (action, data, baseSummary) => {
  const summary = {
    ...baseSummary,
    eventType: action,
    targetUserId: data.targetUserId,
    targetEmail: data.targetEmail,
    performedBy: data.performedBy,
    reason: data.reason || "Manual update",
  };
  if (data.previousValue !== undefined && data.newValue !== undefined) {
    summary.changes = {
      type: {
        from: data.previousValue,
        to: data.newValue,
      }
    };
  }
  if (data.oldSubscription && data.newSubscription) {
    const changes = getSubscriptionChanges(data.oldSubscription, data.newSubscription);
    if (changes) {
      summary.changes = changes;
      summary.actionType = getSubscriptionActionType(changes);
    }
  }

  return summary;
};

module.exports = {
  extractEventSummary,
};