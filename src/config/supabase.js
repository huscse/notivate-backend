import { createClient } from '@supabase/supabase-js';
import config from './env.js';

// Backend client with service_role key - can bypass RLS
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export default supabase;
