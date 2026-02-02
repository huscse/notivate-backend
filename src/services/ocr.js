import vision from '@google-cloud/vision';
import fs from 'fs/promises';
import config from '../config/env.js';

// Initialize Google Cloud Vision client
let client;

if (config.GOOGLE_CLOUD_CREDENTIALS) {
  // Production: Use credentials from environment variable (Railway)
  console.log('🔑 Using Google Cloud credentials from environment variable');
  const credentials = JSON.parse(config.GOOGLE_CLOUD_CREDENTIALS);
  client = new vision.ImageAnnotatorClient({ credentials });
} else {
  // Development: Use credentials from file
  console.log('🔑 Using Google Cloud credentials from file');
  client = new vision.ImageAnnotatorClient({
    keyFilename: config.GOOGLE_VISION_KEY_PATH,
  });
}

/**
 * Extract text from an image using Google Cloud Vision OCR
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imagePath) {
  try {
    // Read the image file
    const imageBuffer = await fs.readFile(imagePath);

    // Convert to base64
    const base64Image = imageBuffer.toString('base64');

    // Call Vision API
    const [result] = await client.textDetection({
      image: { content: base64Image },
    });

    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return '';
    }

    // First annotation contains the full text
    return detections[0].description || '';
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

export default { extractTextFromImage };
