import supabase from '../config/supabase.js';

/**
 * POST /api/auth/signup
 * Create a new user account.
 */
async function signup(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // User profile is automatically created via database trigger

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return session
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        subscriptionTier: profile?.subscription_tier || 'free',
      },
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * POST /api/auth/logout
 * End user session
 */
async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      await supabase.auth.signOut(token);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

/**
 * GET /api/auth/me
 * Get current user info
 */
async function getCurrentUser(req, res) {
  try {
    // User is already attached by authenticateUser middleware
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    // Get current month usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('transforms_count')
      .eq('user_id', req.user.id)
      .eq('month', currentMonth)
      .single();

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        subscriptionTier: profile.subscription_tier,
        stripeCustomerId: profile.stripe_customer_id,
      },
      usage: {
        transformsThisMonth: usage?.transforms_count || 0,
        limit: profile.subscription_tier === 'free' ? 5 : null,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
}

export default { signup, login, logout, getCurrentUser };
