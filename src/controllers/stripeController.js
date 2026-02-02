import stripeService from '../services/stripeService.js';
import supabase from '../config/supabase.js';

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for Premium upgrade
 */
async function createCheckoutSession(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const successUrl = `${process.env.FRONTEND_URL}/upgrade-success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/pricing`;

    const session = await stripeService.createCheckoutSession(
      userId,
      userEmail,
      successUrl,
      cancelUrl,
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/stripe/create-portal-session
 * Create a Stripe billing portal session for managing subscription
 */
async function createPortalSession(req, res) {
  try {
    const userId = req.user.id;

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const returnUrl = `${process.env.FRONTEND_URL}/dashboard`;

    const session = await stripeService.createPortalSession(
      profile.stripe_customer_id,
      returnUrl,
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
async function handleWebhook(req, res) {
  const signature = req.headers['stripe-signature'];

  try {
    // req.body is the raw buffer from express.raw()
    const event = stripeService.constructWebhookEvent(req.body, signature);

    console.log(`🔔 Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Handle successful checkout - upgrade user to premium
 */
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  console.log(`✅ Checkout completed for user ${userId}`);

  // Update user profile to premium
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: 'premium',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to upgrade user:', error);
  } else {
    console.log(`🎉 User ${userId} upgraded to premium`);
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const status = subscription.status;

  console.log(`📝 Subscription updated for customer ${customerId}: ${status}`);

  // Get user by customer ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Update subscription tier based on status
  const tier = ['active', 'trialing'].includes(status) ? 'premium' : 'free';

  await supabase
    .from('user_profiles')
    .update({ subscription_tier: tier })
    .eq('id', profile.id);

  console.log(`Updated user ${profile.id} to ${tier}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  console.log(`❌ Subscription cancelled for customer ${customerId}`);

  // Downgrade user to free tier
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('User not found for customer:', customerId);
    return;
  }

  await supabase
    .from('user_profiles')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
    })
    .eq('id', profile.id);

  console.log(`Downgraded user ${profile.id} to free tier`);
}

export default {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
};
