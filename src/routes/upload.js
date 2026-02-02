import { Router } from 'express';
import upload from '../middleware/upload.js';
import uploadController from '../controllers/uploadController.js';

const router = Router();

// POST /api/upload — single image upload, triggers OCR + AI transform
router.post('/', upload.single('image'), uploadController.uploadAndTransform);

export default router;
