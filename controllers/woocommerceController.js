const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/userModel");
const { WOOCOMMERCE_WEBHOOK_EVENTS } = require("../utils/enum/woocommerce");
const { checkRevenueCatSubscription, areSubscriptionsSame } = require("../utils/subscriptionCrossCheck");
const { resolveUser } = require("../utils/userResolver");
const { logEvent, logSubscriptionChange, logErrorEvent } = require("../utils/eventLogger");

const generateWebhookSignature = (payload, webhookSecret) => {
  return crypto
    .createHmac("sha256", webhookSecret)
    .update(payload, "utf8")
    .digest("base64");
};
const logResponse = (result) => {
  const output =
    typeof result === "string"
      ? result
      : JSON.stringify(result, null, 2);

  console.log(`Response sent | result: ${output}`);
};
const  extraHour =()=> {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  return {
    user_subscription_status: "subscribed_user",
    subscription_type: "trial",
    price: "0 USD",
    purchase_date: now.toISOString(),
    end_date: oneHourLater.toISOString(),
    update_source: "admin",
    update_date: now,
  };
}
const handleWebhook = asyncHandler(async (req, res) => {
  const webhookEvent = req.headers["x-wc-webhook-topic"] || "unknown";
  const webhookData = req.body;

  try {
    const webhookSecretHeader = req.headers["x-wc-webhook-signature"];
    console.log(`Event "${webhookEvent}" received at ${new Date().toLocaleString()}`);
    if (
      ![
        WOOCOMMERCE_WEBHOOK_EVENTS.CustomerCreated,
        WOOCOMMERCE_WEBHOOK_EVENTS.CustomerUpdated,
        WOOCOMMERCE_WEBHOOK_EVENTS.CustomerDeleted,
        WOOCOMMERCE_WEBHOOK_EVENTS.SubscriptionCreated,
        WOOCOMMERCE_WEBHOOK_EVENTS.SubscriptionUpdated,
        WOOCOMMERCE_WEBHOOK_EVENTS.OrderCreated,
      ].includes(webhookEvent)
    ) {
      logResponse("incorrect webhook received");
      return res.status(200).json({ result: false, message: "incorrect webhook received" });
    }

    const generatedSignature = generateWebhookSignature(
      req.rawBody,
      process.env.WOOCOMMERCE_WEBHOOK_SECRET
    );
    if (webhookSecretHeader !== generatedSignature) {
      await logErrorEvent({
        userIdentifier: webhookData.id || webhookData.customer_id,
        source: "wp",
        action: webhookEvent,
        errorMessage: "Unauthorized webhook",
        rawData: webhookData,
      });
      return res.status(200).json({ result: false, message: "unauthorized webhook" });
    }

    await processWebhook(res, webhookData, webhookEvent);
  } catch (error) {
    logResponse(error.message);
    await logErrorEvent({
      userIdentifier: webhookData.id || webhookData.customer_id,
      source: "wp",
      action: webhookEvent,
      errorMessage: error.message,
      rawData: webhookData,
    });
    return res.status(200).json({ result: false, message: error.message });
  }
});

async function processWebhook(res, webhookData, webhookEvent) {
  try {
    if (webhookData && webhookEvent) {
      switch (webhookEvent) {
        case WOOCOMMERCE_WEBHOOK_EVENTS.CustomerCreated:
        case WOOCOMMERCE_WEBHOOK_EVENTS.CustomerUpdated:
          return await createOrUpdateCustomer(res, webhookData, webhookEvent);
        case WOOCOMMERCE_WEBHOOK_EVENTS.CustomerDeleted:
          return await deleteCustomer(res, webhookData, webhookEvent);
        case WOOCOMMERCE_WEBHOOK_EVENTS.OrderCreated:
        case WOOCOMMERCE_WEBHOOK_EVENTS.SubscriptionCreated:
        case WOOCOMMERCE_WEBHOOK_EVENTS.SubscriptionUpdated:
          return await createOrder(res, webhookData, webhookEvent);
        default:
          logResponse("unknown event");
          return res.status(200).json({ result: false, message: "unknown event" });
      }
    }
    logResponse("unsupported event");
    return res.status(200).json({ result: false, message: "unsupported event" });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ result: false, message: error.message });
  }
}

async function fetchLatestSubscription(customerId) {
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
    new Date(current.date_modified) > new Date(latest.date_modified) ? current : latest
  );
}

function calculateSubscriptionDetails(subscription) {
  const today = new Date();
  const purchase_date = subscription?.start_date_gmt
    ? new Date(subscription.start_date_gmt + "Z").toISOString()
    : today.toISOString();
  let end_date = subscription?.next_payment_date_gmt || subscription?.end_date_gmt;
  end_date=end_date
    ? new Date(end_date + "Z").toISOString()
    : today.toISOString();
  let price ="0";
  let subscription_type = "";
  let user_subscription_status = "free_user";
  let wpLanguage = null;
  const currency = subscription?.currency || "USD"

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
      const variationId = item.variation_id?.toString();
      const plan = allSubscriptions[variationId];
      if (plan) {
        subscription_type = plan;
        user_subscription_status = "subscribed_user";
        price = `${item?.subtotal || 0}`;
        wpLanguage = esSubscriptions[variationId] ? "es" : null;
      }
    }
  }

  return {
    purchase_date,
    end_date,
    price: `${price} ${currency}`,
    subscription_type,
    user_subscription_status,
    wpLanguage,
  };
}

async function createOrUpdateCustomer(res, webhookData, webhookEvent) {
  try {
    const existingUserByUid = await User.findOne({ uid: webhookData.id });
    const normalizedEmail = webhookData?.email?.toLowerCase().trim();
    const existingUserByEmail = await User.findOne({ email: normalizedEmail });

    const currentUser = existingUserByUid || existingUserByEmail;
    const oldSubscription = currentUser?.subscription
      ? JSON.parse(JSON.stringify(currentUser.subscription))
      : null;
    const isNewUser = !currentUser;

    const latestSubscription = await fetchLatestSubscription(webhookData.id);
    const {
      purchase_date,
      end_date,
      price,
      subscription_type,
      user_subscription_status,
      wpLanguage,
    } = calculateSubscriptionDetails(latestSubscription);

    let documentToInsert = {
      uid: webhookData.id,
      name: `${webhookData.first_name ?? ""} ${webhookData.last_name ?? ""}`.trim(),
      firstName: webhookData.first_name,
      lastName: webhookData.last_name,
      email: normalizedEmail,
      role: webhookData?.role === "administrator" ? 1 : 0,
      "subscription.user_subscription_status": user_subscription_status,
      "subscription.subscription_type": subscription_type,
      "subscription.price": price,
      "subscription.purchase_date": purchase_date,
      "subscription.end_date": end_date,
      "subscription.update_source": "wp",
      "subscription.update_date": new Date(),
      singuptype: "web",
      ...(wpLanguage && { wpLanguage }),
    };
    if (user_subscription_status === "free_user") {
      const rcSubscription = await checkRevenueCatSubscription(webhookData.id);

      if (rcSubscription) {
        if (currentUser && currentUser.subscription) {
          const isSame = areSubscriptionsSame(currentUser.subscription, rcSubscription);

          if (isSame) {
            await logEvent({
              userIdentifier: currentUser._id,
              source: "wp",
              action: webhookEvent,
              rawData: webhookData,
              details: "RC subscription already in DB - no changes",
              success: true,
            });
            return res.status(200).json({
              result: true,
              message: "RC subscription already in DB",
            });
          }
        }

        documentToInsert = {
          ...documentToInsert,
          "subscription.user_subscription_status": rcSubscription.user_subscription_status,
          "subscription.subscription_type": rcSubscription.subscription_type,
          "subscription.price": rcSubscription.price,
          "subscription.purchase_date": rcSubscription.purchase_date,
          "subscription.end_date": rcSubscription.end_date,
          "subscription.update_source": "rc",
          "singuptype": "mobile"
        };
      }
    }

    let updatedUser;

    if (existingUserByUid) {
      const emailChanged = existingUserByUid.email.toLowerCase() !== normalizedEmail;

      if (emailChanged) {
        const emailTaken = await User.findOne({
          email: normalizedEmail,
          uid: { $ne: webhookData.id }
        });

        if (emailTaken) {
          await revertEmailInWordPress(webhookData.id, existingUserByUid.email);
          await logErrorEvent({
            userIdentifier: existingUserByUid._id,
            source: "wp",
            action: webhookEvent,
            errorMessage: "Email already exists, reverted in WordPress",
            rawData: webhookData,
          });
          logResponse("Email already exists, reverted in WordPress");
          return res.status(200).json({
            result: false,
            message: "Email already exists, reverted in WordPress",
          });
        }
      }

      updatedUser = await User.findOneAndUpdate(
        { uid: webhookData.id },
        { $set: documentToInsert },
        { new: true }
      );
    } else if (existingUserByEmail) {
      updatedUser = await User.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: documentToInsert },
        { new: true }
      );
    } else {
      const trialSub = extraHour();
      updatedUser = await User.create({
        uid: webhookData.id,
        name: `${webhookData.first_name ?? ""} ${webhookData.last_name ?? ""}`.trim(),
        firstName: webhookData.first_name,
        lastName: webhookData.last_name,
        email: normalizedEmail,
        singuptype: "web",
        role: webhookData?.role === "administrator" ? 1 : 0,
        ...(wpLanguage && { wpLanguage }),
        subscription: user_subscription_status === "subscribed_user" 
      ? {
          user_subscription_status,
          subscription_type,
          price,
          purchase_date,
          end_date,
          update_source: "wp",
          update_date: new Date(),
        }
      : trialSub,
      });
    }

    const newSubscription = JSON.parse(JSON.stringify(updatedUser.subscription || {}));

    if (isNewUser) {
      await logEvent({
        userIdentifier: updatedUser._id,
        source: "wp",
        action: "customer.created",
        rawData: webhookData,
        details: `New customer created: ${updatedUser.firstName || ''} ${updatedUser.lastName || ''} (${normalizedEmail})`.trim(),
        success: true,
        performedBy: "WordPress webhook",
      });

      if (user_subscription_status === "subscribed_user") {
        const newSubData = {
          user_subscription_status,
          subscription_type,
          price,
          purchase_date,
          end_date,
        };

        await logEvent({
          userIdentifier: updatedUser._id,
          source: "wp",
          action: "subscription.activated",
          rawData: webhookData,
          details: `New subscription activated: ${subscription_type} (${price}) expires ${new Date(end_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`,
          success: true,
          performedBy: "WordPress webhook",
          oldSubscription: null,
          newSubscription: newSubData,
          isNewSubscription: true,
        });
      }
    } else {
      await logSubscriptionChange({
        userIdentifier: updatedUser._id,
        source: "wp",
        action: webhookEvent,
        oldSubscription,
        newSubscription,
        rawData: webhookData,
        performedBy: "WordPress webhook",
      });
    }
    logResponse({msg:"Customer Updated",email:normalizedEmail,uid:webhookData.id});
    return res.status(200).json({ result: true });
  } catch (error) {
    console.error(error);
    await logErrorEvent({
      userIdentifier: webhookData.id,
      source: "wp",
      action: webhookEvent,
      errorMessage: error.message,
      rawData: webhookData,
    });
    return res.status(200).json({ result: false, message: error.message });
  }
}

async function revertEmailInWordPress(uid, oldEmail) {
  const url = `${process.env.WOOCOMMERCE_API_URL}/wp-json/wc/v3/customers/${uid}`;
  const auth = Buffer.from(
    `${process.env.WOOCOMMERCE_CONSUMER_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`
  ).toString("base64");

  await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`
    },
    body: JSON.stringify({ email: oldEmail })
  });
}
async function createOrder(res, webhookData,webhookEvent) {
  try {
    const currentUser = await resolveUser(webhookData.customer_id);

    if (!currentUser) {
      console.log(`[WP Webhook] User not found for customer_id: ${webhookData.customer_id}, skipping event`);
      return res.status(200).json({ result: false, message: "User not found" });
    }

    const oldSubscription = JSON.parse(JSON.stringify(currentUser.subscription || {}));

    const latestSubscription = await fetchLatestSubscription(webhookData.customer_id);
    const {
      purchase_date,
      end_date,
      price,
      subscription_type,
      user_subscription_status,
      wpLanguage,
    } = calculateSubscriptionDetails(latestSubscription);

    let detail = {
      "subscription.user_subscription_status": user_subscription_status,
      "subscription.subscription_type": subscription_type,
      "subscription.price": price,
      "subscription.purchase_date": purchase_date,
      "subscription.end_date": end_date,
      "subscription.update_source": "wp",
      "subscription.update_date": new Date(),
      singuptype: "web",
      ...(wpLanguage && { wpLanguage }),
    };
        if (user_subscription_status === "free_user") {
      const rcSubscription = await checkRevenueCatSubscription(webhookData.customer_id);

      if (rcSubscription) {
        const isSame = areSubscriptionsSame(currentUser.subscription, rcSubscription);
        if (isSame) {
          await logEvent({
            userIdentifier: currentUser._id,
            source: "wp",
            action: webhookEvent,
            rawData: webhookData,
            details: "RC subscription already in DB - no changes",
            success: true,
          });
          logResponse({ msg: "RC subscription already in DB", email: currentUser.email });
          return res.status(200).json({
            result: true,
            message: "RC subscription already in DB",
          });
        }

        detail = {
          "subscription.user_subscription_status": rcSubscription.user_subscription_status,
          "subscription.subscription_type": rcSubscription.subscription_type,
          "subscription.price": rcSubscription.price,
          "subscription.purchase_date": rcSubscription.purchase_date,
          "subscription.end_date": rcSubscription.end_date,
          "subscription.update_source": "rc",
          "subscription.update_date": new Date(),
          "singuptype": "mobile"
        };
      }
    }
    const result = await User.findOneAndUpdate(
      { uid: webhookData.customer_id },
      { $set: detail },
      { new: true }
    );

    const newSubscription = JSON.parse(JSON.stringify(result.subscription || {}));

    await logSubscriptionChange({
      userIdentifier: result._id,
      source: "wp",
      action: webhookEvent,
      oldSubscription,
      newSubscription,
      rawData: webhookData,
      performedBy: "WordPress webhook",
    });

    logResponse({ msg: "Subscription Updated", email: result?.email });
    return res.status(200).json({ result });
  } catch (error) {
    logResponse(error);
    await logErrorEvent({
      userIdentifier: webhookData.customer_id,
      source: "wp",
      action: webhookEvent,
      errorMessage: error.message,
      rawData: webhookData,
    });
    return res.status(200).json({ result: false, message: error.message });
  }
}
async function deleteCustomer(res, webhookData, webhookEvent) {
  try {
    const currentUser = await resolveUser(webhookData.id);

    if (!currentUser) {
      await logErrorEvent({
        userIdentifier: webhookData.id,
        source: "wp",
        action: webhookEvent,
        errorMessage: "Customer not found for deletion",
        rawData: webhookData,
        status: 404,
      });
      logResponse("Customer not found");
      return res.status(200).json({ result: false, message: "Customer not found" });
    }
    await logEvent({
      userIdentifier: currentUser._id,
      source: "wp",
      action: webhookEvent,
      rawData: webhookData,
      details: `Customer deleted: ${currentUser.email} (uid: ${currentUser.uid})`,
      success: true,
    });
    await User.deleteOne({ uid: webhookData.id });

    logResponse("Customer deleted");
    return res.status(200).json({ result: true });
  } catch (error) {
    logResponse(error);
    await logErrorEvent({
      userIdentifier: webhookData.id,
      source: "wp",
      action: webhookEvent,
      errorMessage: error.message,
      rawData: webhookData,
    });
    return res.status(200).json({ result: false, message: error.message });
  }
}

module.exports = {
  handleWebhook,
};
