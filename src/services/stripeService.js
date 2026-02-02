import Stripe from 'stripe';
import config from '../config/env.js';

const stripe = new Stripe(config.STRIPE_SECRET_KEY);

/**
 * Create a Stripe Checkout session for Premium subscription
 */
async function createCheckoutSession(userId, userEmail, successUrl, cancelUrl) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: config.STRIPE_PRICE_ID, // Premium plan price ID
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return session;
  } catch (error) {
    console.error('Stripe checkout error:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a Stripe billing portal session for managing subscription
 */
async function createPortalSession(customerId, returnUrl) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Stripe portal error:', error);
    throw new Error('Failed to create portal session');
  }
}

/**
 * Construct webhook event from raw body and signature
 */
function constructWebhookEvent(rawBody, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw new Error('Invalid webhook signature');
  }
}

export default {
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
};
