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

    // Get usage record for this month
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
      // No record yet this month — first transform is fine
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
 * Increment usage counter after a successful transform.
 * Called directly from the controller — not as middleware.
 */
async function incrementUsage(userId) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // Check if a row already exists for this user + month
    const { data: existing, error: selectError } = await supabase
      .from('usage_tracking')
      .select('id, transforms_count')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (existing) {
      // Row exists — increment the count
      const { error: updateError } = await supabase
        .from('usage_tracking')
        .update({ transforms_count: existing.transforms_count + 1 })
        .eq('user_id', userId)
        .eq('month', currentMonth);

      if (updateError) throw updateError;

      console.log(
        `📊 Usage incremented for ${userId}: ${
          existing.transforms_count + 1
        }/${currentMonth}`,
      );
    } else {
      // No row yet — insert with count = 1
      const { error: insertError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          month: currentMonth,
          transforms_count: 1,
        });

      if (insertError) throw insertError;

      console.log(`📊 Usage record created for ${userId}: 1/${currentMonth}`);
    }
  } catch (error) {
    console.error('Failed to increment usage:', error);
    // Don't throw — usage tracking failure shouldn't break the transform
  }
}

export { authenticateUser, checkUsageLimit, incrementUsage };
