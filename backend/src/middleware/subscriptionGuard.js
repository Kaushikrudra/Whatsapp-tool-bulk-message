/**
 * Middleware to protect dashboard-related API endpoints.
 * Only allows access if the authenticated user has subscription_status='active'
 * and the plan_expiry has not passed.
 */
const subscriptionGuard = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User authentication required.' });
  }

  const { subscription_status, plan_expiry } = req.user;
  const isExpired = plan_expiry && new Date(plan_expiry) < new Date();

  if (subscription_status === 'active' && !isExpired) {
    return next();
  }

  return res.status(403).json({
    error: 'Subscription Required',
    message: 'An active Pro subscription (₹2,999/month) is required to access dashboard features and API endpoints.',
    subscription_status: subscription_status || 'inactive',
    plan_expiry: plan_expiry || null
  });
};

module.exports = subscriptionGuard;
