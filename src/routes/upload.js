import { Router } from 'express';
import upload from '../middleware/upload.js';
import uploadController from '../controllers/uploadController.js';
import {
  authenticateUser,
  checkUsageLimit,
} from '../middleware/Authmiddleware.js';

const router = Router();

// POST /api/upload — protected route with usage limits
router.post(
  '/',
  authenticateUser,
  checkUsageLimit,
  upload.single('image'),
  uploadController.uploadAndTransform,
);

export default router;
