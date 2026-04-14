const axios = require("axios");
const User = require("../models/userModel");

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
const normalizeSubscription = ({
  source,
  user_subscription_status,
  subscription_type,
  price,
  purchase_date,
  end_date,
}) => ({
  user_subscription_status,
  subscription_type,
  price,
  purchase_date,
  end_date,
  update_source: source,
  update_date: new Date(),
});

const fetchLatestWPSubscription = async (customerId) => {
  const urls = [
    `?customer=${customerId}&status=active`,
    `?customer=${customerId}&status=pending-cancel`,
  ].map((path) =>
    axios.get(
      `${process.env.WOOCOMMERCE_API_URL}/wp-json/wc/v3/subscriptions${path}`,
      {
        auth: {
          username: process.env.WOOCOMMERCE_CONSUMER_KEY,
          password: process.env.WOOCOMMERCE_CONSUMER_SECRET,
        },
      }
    )
  );

  const [activeResp, pendingResp] = await Promise.all(urls);
  const activeData = Array.isArray(activeResp.data) ? activeResp.data : [];
  const pendingData = Array.isArray(pendingResp.data) ? pendingResp.data : [];

  const allSubs = activeData.length ? activeData : pendingData;
  if (!allSubs.length) return null;

  return allSubs.reduce((latest, current) =>
    new Date(current.date_modified) > new Date(latest.date_modified)
      ? current
      : latest
  );
};

const parseRCSubscription = (subscriptionData) => {
  const subscriber = subscriptionData?.subscriber;
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

  return normalizeSubscription({
    source: "rc",
    user_subscription_status: "subscribed_user",
    subscription_type,
    price: `${price} ${currency}`,
    purchase_date: activeSubscription.purchase_date
      ? new Date(activeSubscription.purchase_date).toISOString()
      : "",
    end_date: activeSubscription.expires_date
      ? new Date(activeSubscription.expires_date).toISOString()
      : "",
  });

};

const parseWPSubscription = (subscription) => {
  if (!subscription) return null;

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

  return normalizeSubscription({
    source: "wp",
    user_subscription_status: "subscribed_user",
    subscription_type,
    price: `${price} ${currency}`,
    purchase_date,
    end_date,
  });
};

const checkRevenueCatSubscription = async (userId) => {
  try {
    const user = await User.findOne({ uid: userId });
    if (!user) return null;

    const rcUserId = user.rcUserId || user._id.toString();

    const subscriptionData = await fetchRevenueCatSubscription(rcUserId);
    return parseRCSubscription(subscriptionData);
  } catch (error) {
    console.error("Error checking RC subscription:", error.message);
    return null;
  }
};

const checkWooCommerceSubscription = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.uid) return null;

    const subscription = await fetchLatestWPSubscription(user.uid);
    return parseWPSubscription(subscription);
  } catch (error) {
    console.error("Error checking WP subscription:", error.message);
    return null;
  }
};

const areSubscriptionsSame = (dbSub, newSub) => {
  if (!dbSub || !newSub) return false;

  const normalizeDate = (date) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const normalizePrice = (price) => {
    if (!price) return "0";
    return price.split(" ")[0];
  };

  return (
    normalizeDate(dbSub.end_date) === normalizeDate(newSub.end_date) &&
    dbSub.subscription_type === newSub.subscription_type &&
    normalizePrice(dbSub.price) === normalizePrice(newSub.price)
  );
};

module.exports = {
  checkRevenueCatSubscription,
  checkWooCommerceSubscription,
  areSubscriptionsSame,
};