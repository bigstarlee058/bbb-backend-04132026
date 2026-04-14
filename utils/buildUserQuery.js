const buildUserCriteriaQuery = (criteria) => {
  const query = {};
  if (criteria.subscriptionStatus && criteria.subscriptionStatus !== "all") {
    if (criteria.subscriptionStatus === "subscribed_user") {
      query["subscription.user_subscription_status"] = "subscribed_user";
    } else if (criteria.subscriptionStatus === "free") {
      query["subscription.user_subscription_status"] = { 
        $in: [null, undefined, "free", "free_user"] 
      };
    }
  }
  if (criteria.subscriptionType && criteria.subscriptionType.length > 0) {
    query["subscription.subscription_type"] = { $in: criteria.subscriptionType };
  }
  if (criteria.subscriptionSource && criteria.subscriptionSource.length > 0) {
    query["subscription.update_source"] = { $in: criteria.subscriptionSource };
  }
  if (criteria.signupSource && criteria.signupSource !== "all") {
    if (criteria.signupSource === "mobile") {
      query.singuptype = "mobile";
    } else if (criteria.signupSource === "wordpress") {
      query.singuptype = { $ne: "mobile" };
    }
  }
  return query;
};

module.exports = { buildUserCriteriaQuery };