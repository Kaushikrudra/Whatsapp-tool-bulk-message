import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dmbpphotjptetkdmqjlv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtYnBwaG90anB0ZXRrZG1xamx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgwNjQ5MywiZXhwIjoyMDk4MzgyNDkzfQ.JBKnVRqzitdYtkf2drSGlPWs_Sw7PR3ctFTSmlkdvYI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
