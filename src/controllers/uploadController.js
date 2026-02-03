import ocrService from '../services/ocr.js';
import transformService from '../services/transform.js';
import cleanup from '../utils/cleanup.js';
import { incrementUsage } from '../middleware/Authmiddleware.js';

/**
 * POST /api/upload
 * Receives an image, runs OCR, transforms notes, returns structured study guide
 */
async function uploadAndTransform(req, res) {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'No image uploaded. Please include an image file.' });
    }

    console.log(`📥 Received upload: ${req.file.originalname}`);

    // Step 1: Extract text from the image using Google Vision OCR
    console.log('🔍 Running OCR...');
    const rawText = await ocrService.extractTextFromImage(filePath);

    if (!rawText || rawText.trim() === '') {
      return res.status(400).json({
        error:
          'No text could be extracted from this image. Try a clearer photo with more visible text.',
      });
    }

    console.log(`📝 OCR extracted ${rawText.length} characters`);

    // Step 2: Transform the raw text into a study guide using GPT-4
    console.log('✨ Transforming notes with AI...');
    const studyGuide = await transformService.transformNotes(rawText);

    console.log(`✅ Successfully transformed notes: "${studyGuide.title}"`);

    // Step 3: Increment usage AFTER successful transform (free users only)
    if (req.user && req.user.subscriptionTier !== 'premium') {
      await incrementUsage(req.user.id);
    }

    // Step 4: Return the study guide
    res.json({
      success: true,
      rawText,
      studyGuide,
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    res.status(500).json({
      error:
        error.message || 'Something went wrong while processing your notes.',
    });
  } finally {
    // Always clean up the temp file.
    if (filePath) {
      cleanup.deleteFile(filePath);
    }
  }
}

export default { uploadAndTransform };
