import { Router } from 'express';
import authController from '../controllers/AuthController.js';
import { authenticateUser } from '../middleware/Authmiddleware.js';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateUser, authController.getCurrentUser);

export default router;
