import supabase from '../config/supabase.js';

/**
 * Middleware to verify Supabase JWT token and attach user info to req
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      subscriptionTier: profile.subscription_tier,
      stripeCustomerId: profile.stripe_customer_id,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check if user has transforms remaining this month
 */
async function checkUsageLimit(req, res, next) {
  try {
    const userId = req.user.id;
    const subscriptionTier = req.user.subscriptionTier;

    // Premium users have unlimited transforms
    if (subscriptionTier === 'premium') {
      req.usageAllowed = true;
      return next();
    }

    // Free users: 5 transforms per month
    const FREE_TIER_LIMIT = 5;
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // Get or create usage record for this month
    const { data: usage, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      throw error;
    }

    if (!usage) {
      // First transform this month - create record
      req.usageAllowed = true;
      req.currentUsage = 0;
      req.usageLimit = FREE_TIER_LIMIT;
      return next();
    }

    // Check if limit reached
    if (usage.transforms_count >= FREE_TIER_LIMIT) {
      return res.status(403).json({
        error: 'Monthly transform limit reached',
        message: `You've used all ${FREE_TIER_LIMIT} free transforms this month. Upgrade to Premium for unlimited transforms!`,
        currentUsage: usage.transforms_count,
        limit: FREE_TIER_LIMIT,
        upgradePath: '/pricing',
      });
    }

    req.usageAllowed = true;
    req.currentUsage = usage.transforms_count;
    req.usageLimit = FREE_TIER_LIMIT;
    next();
  } catch (error) {
    console.error('Usage check error:', error);
    return res.status(500).json({ error: 'Failed to check usage limits' });
  }
}

/**
 * Increment usage counter after successful transform
 */
async function incrementUsage(userId) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Upsert usage record
    const { error } = await supabase.from('usage_tracking').upsert(
      {
        user_id: userId,
        month: currentMonth,
        transforms_count: 1,
      },
      {
        onConflict: 'user_id,month',
        // Increment if exists, set to 1 if new
      },
    );

    if (error) {
      // If record exists, manually increment
      await supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_month: currentMonth,
      });
    }
  } catch (error) {
    console.error('Failed to increment usage:', error);
    // Don't fail the request if usage tracking fails
  }
}

export { authenticateUser, checkUsageLimit, incrementUsage };
