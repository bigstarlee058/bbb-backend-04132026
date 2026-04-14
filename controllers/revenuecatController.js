const asyncHandler = require("express-async-handler");
const axios = require("axios");
const User = require("../models/userModel");
const { checkWooCommerceSubscription, areSubscriptionsSame } = require("../utils/subscriptionCrossCheck");
const { resolveUser } = require("../utils/userResolver");
const { logEvent, logSubscriptionChange, logErrorEvent } = require("../utils/eventLogger");

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
const verifyWebhookAuth = (req) => {
  const auth = req.headers["authorization"];
  return auth && auth === `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`;
};

const handleWebhook = asyncHandler(async (req, res) => {
  const webhookData = req.body;
  const eventType = webhookData?.event?.type || "unknown";
  const appUserId = webhookData?.event?.app_user_id;

  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await logErrorEvent({
        userIdentifier: appUserId,
        source: "rc",
        action: eventType,
        errorMessage: "Missing authorization header",
        rawData: webhookData,
      });
      return res.status(200).json({ result: false, message: "Missing authorization header" });
    }

    if (!verifyWebhookAuth(req)) {
      await logErrorEvent({
        userIdentifier: appUserId,
        source: "rc",
        action: eventType,
        errorMessage: "Unauthorized webhook",
        rawData: webhookData,
      });
      return res.status(200).json({ result: false, message: "Unauthorized webhook" });
    }

    await processWebhook(webhookData, res);
  } catch (err) {
    await logErrorEvent({
      userIdentifier: appUserId,
      source: "rc",
      action: eventType,
      errorMessage: err.message,
      rawData: webhookData,
    });
    return res.status(200).json({ result: false, message: err.message });
  }
});

async function processWebhook(webhookData, res) {
  const eventType = webhookData?.event?.type || "unknown";
  const event = webhookData.event;
  let appUserId = event.app_user_id;
  let rcUserId = null;

  try {
    if (appUserId.startsWith("$RCAnonymousID:")) {
      rcUserId = event.original_app_user_id;
      const existingUser = await User.findOne({ rcUserId: appUserId });
      
      if (existingUser) {
        appUserId = existingUser._id;
      } else {
        let email = event.subscriber_attributes?.$email?.value;
        
        if (!email) {
          try {
            const rcData = await fetchRevenueCatSubscription(appUserId);
            email = rcData?.subscriber?.subscriber_attributes?.$email?.value || null;
          } catch (e) {
            console.error("Failed to fetch RC data:", e.message);
          }
        }

        if (!email) {
          await logErrorEvent({
            userIdentifier: appUserId,
            source: "rc",
            action: eventType,
            errorMessage: "Email not found for anonymous user",
            rawData: webhookData,
          });
          return res.status(200).json({ result: false, message: "Email not found for anonymous user" });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
          await logErrorEvent({
            userIdentifier: appUserId,
            source: "rc",
            action: eventType,
            errorMessage: "User not found by email",
            rawData: webhookData,
          });
          return res.status(200).json({ result: false, message: "User not found by email" });
        }

        appUserId = user._id;
      }
    }

    const currentUser = await resolveUser(appUserId);
    if (!currentUser) {
      await logErrorEvent({
        userIdentifier: appUserId,
        source: "rc",
        action: eventType,
        errorMessage: "User not found",
        rawData: webhookData,
      });
      return res.status(200).json({ result: false, message: "User not found" });
    }

    const oldSubscription = { ...currentUser.subscription };

    const subscriptionData = await fetchRevenueCatSubscription(rcUserId || appUserId);
    const subscriber = subscriptionData?.subscriber;

    let details = {};

    if (!subscriber) {
      details = {
        user_subscription_status: "free_user",
        subscription_type: "",
        price: "0",
        purchase_date: "",
        end_date: "",
      };
    } else {
      const now = Date.now();
      const subscriptionsMap = subscriber.subscriptions || {};
      const subscriptions = Object.values(subscriptionsMap);

      if (!subscriptions.length) {
        details = {
          user_subscription_status: "free_user",
          subscription_type: "",
          price: "0",
          purchase_date: "",
          end_date: "",
        };
      } else {
        const activeSubscription = subscriptions
          .filter((s) => {
            if (!s.expires_date) return false;
            if (s.refunded_at) return false;
            const expiresAt = new Date(s.expires_date).getTime();
            return expiresAt > now;
          })
          .sort((a, b) => new Date(b.expires_date).getTime() - new Date(a.expires_date).getTime())[0];

        if (!activeSubscription) {
          details = {
            user_subscription_status: "free_user",
            subscription_type: "",
            price: "0",
            purchase_date: "",
            end_date: "",
          };
        } else {
          const productId = (
            activeSubscription.product_identifier ||
            Object.keys(subscriptionsMap).find((key) => subscriptionsMap[key] === activeSubscription) ||
            ''
          ).toLowerCase();

          let subscription_type = 'monthly';
          if (productId.includes('year') || productId.includes('annual')) {
            subscription_type = 'yearly';
          } else if (productId.includes('quarter') || productId.includes('3month')) {
            subscription_type = 'quarterly';
          } else if (productId.includes('month')) {
            subscription_type = 'monthly';
          } else if (productId.includes('week')) {
            subscription_type = 'weekly';
          } else if (productId.includes('trial')) {
            subscription_type = 'trial';
          }

          const purchase_date = activeSubscription.purchase_date
            ? new Date(activeSubscription.purchase_date).toISOString()
            : '';

          const end_date = activeSubscription.expires_date
            ? new Date(activeSubscription.expires_date).toISOString()
            : '';

          const price = activeSubscription.price?.amount ?? 0;
          const currency = activeSubscription.price?.currency ?? 'USD';

          details = {
            user_subscription_status: "subscribed_user",
            subscription_type,
            price: `${price} ${currency}`,
            purchase_date,
            end_date,
          };
        }
      }
    }

    if (details.user_subscription_status === "free_user") {
      const wpSubscription = await checkWooCommerceSubscription(appUserId);

      if (wpSubscription) {
        const isSame = areSubscriptionsSame(currentUser.subscription, wpSubscription);
        if (isSame) {
          await logEvent({
            userIdentifier: currentUser._id,
            source: "rc",
            action: eventType,
            rawData: webhookData,
            details: "WP subscription already in DB",
            success: true,
          });
          return res.status(200).json({
            result: true,
            message: "WP subscription already in DB",
          });
        }

        details = {
          ...wpSubscription,
          update_source: "wp",
          singuptype:"web"
        };
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      {
        $set: {
          "subscription.user_subscription_status": details.user_subscription_status,
          "subscription.subscription_type": details.subscription_type,
          "subscription.price": details.price,
          "subscription.purchase_date": details.purchase_date,
          "subscription.end_date": details.end_date,
          "subscription.update_source": details.update_source || "rc",
          "subscription.update_date": new Date(),
          singuptype: details.singuptype || "mobile",
          ...(rcUserId && { rcUserId: rcUserId })
        }
      },
      { new: true }
    );

    await logSubscriptionChange({
      userIdentifier: updatedUser._id,
      source: "rc",
      action: eventType,
      oldSubscription,
      newSubscription: updatedUser.subscription,
      rawData: webhookData,
      performedBy: "RevenueCat webhook",
    });

    return res.status(200).json({ result: true, details });
  } catch (err) {
    await logErrorEvent({
      userIdentifier: appUserId,
      source: "rc",
      action: eventType,
      errorMessage: err.message,
      rawData: webhookData,
    });
    return res.status(200).json({ result: false, message: err.message });
  }
}

module.exports = { handleWebhook };