import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  PORT: process.env.PORT || 3001,
  GOOGLE_VISION_KEY_PATH: process.env.GOOGLE_CLOUD_CREDENTIALS
    ? null // Production: credentials from env var
    : path.resolve(__dirname, '../../' + process.env.GOOGLE_VISION_KEY_PATH),
  GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS, // For Railway
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validate that required env vars are set
const missing = [];
if (
  !config.OPENAI_API_KEY ||
  config.OPENAI_API_KEY === 'your_openai_key_here'
) {
  missing.push('OPENAI_API_KEY');
}
if (!process.env.GOOGLE_VISION_KEY_PATH && !config.GOOGLE_CLOUD_CREDENTIALS) {
  missing.push('GOOGLE_VISION_KEY_PATH or GOOGLE_CLOUD_CREDENTIALS');
}
if (!config.SUPABASE_URL) {
  missing.push('SUPABASE_URL');
}
if (!config.SUPABASE_SERVICE_KEY) {
  missing.push('SUPABASE_SERVICE_KEY');
}
if (missing.length > 0) {
  console.warn(
    `⚠️  Missing env vars: ${missing.join(', ')} — check your server/.env file`,
  );
}

export default config;
