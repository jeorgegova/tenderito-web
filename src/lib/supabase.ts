import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tcpisfhtnobrpafinevc.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcGlzZmh0bm9icnBhZmluZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTkxMzYsImV4cCI6MjEwNjg5NTEzNn0.l-0PhpjRDMPXgtej_9uePWrJHkhap-GVk_UsFVapBZ0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
