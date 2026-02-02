import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticateUser } from '../middleware/Authmiddleware.js';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateUser, AuthController.getCurrentUser);

export default router;
