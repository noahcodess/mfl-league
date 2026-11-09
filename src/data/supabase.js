// The one shared connection to the league database.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Some previews block browser storage; fall back to memory so the page still works (you just stay logged in less).
function pickStorage() {
  try {
    window.localStorage.setItem('mfl-test', '1');
    window.localStorage.removeItem('mfl-test');
    return window.localStorage;
  } catch {
    const mem = {};
    return { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
  }
}

export const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: pickStorage(), storageKey: 'mfl-auth', persistSession: true, autoRefreshToken: true },
});
