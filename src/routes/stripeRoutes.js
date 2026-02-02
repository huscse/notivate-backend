import { Router } from 'express';
import stripeController from '../controllers/stripeController.js';
import { authenticateUser } from '../middleware/Authmiddleware.js';

const router = Router();

// Protected routes - require authentication
router.post(
  '/create-checkout-session',
  authenticateUser,
  stripeController.createCheckoutSession,
);
router.post(
  '/create-portal-session',
  authenticateUser,
  stripeController.createPortalSession,
);

// Webhook - raw body handled in main index.js, no auth required
router.post('/webhook', stripeController.handleWebhook);

export default router;
