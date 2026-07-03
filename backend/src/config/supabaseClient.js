const { createClient } = require('@supabase/supabase-js');

// Polyfill WebSocket for Node.js < 22 where Supabase Realtime client expects it
if (typeof global.WebSocket === 'undefined') {
  try {
    global.WebSocket = require('ws');
  } catch (err) {
    console.warn('[Supabase] Warning: WebSocket polyfill (ws) could not be loaded:', err.message);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing or contains placeholder. Supabase Storage client won\'t function correctly.');
}

const supabase = createClient(
  supabaseUrl || 'https://dmbpphotjptetkdmqjlv.supabase.co',
  supabaseAnonKey || ''
);

module.exports = supabase;
