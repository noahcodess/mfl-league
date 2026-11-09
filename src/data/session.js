// Login state: who is signed in, their profile, and which login step they're on.
import { useEffect, useState, useCallback } from 'react';
import { db } from './supabase.js';
import { emailFor } from './config.js';
import { DEMO, demoSession } from './demo.js';

const SIGNED_OUT = { status: 'out', user: null, profile: null, keyStatus: null, unlocked: false };

async function readSession() {
  const { data } = await db.auth.getSession();
  const user = data.session?.user;
  if (!user) return SIGNED_OUT;
  const { data: profile } = await db.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (!profile) return { ...SIGNED_OUT, error: 'This login has no MFL profile. Ask the commissioner.' };
  if (profile.role !== 'commissioner') {
    // The site owner gets commissioner powers while test mode is on (the database decides).
    const { data: testCommish } = profile.site_owner ? await db.rpc('is_commissioner') : { data: false };
    return { status: 'in', user, profile, keyStatus: null, unlocked: testCommish === true };
  }
  const [{ data: keyStatus }, { data: unlocked }] = await Promise.all([db.rpc('commish_key_status'), db.rpc('is_commissioner')]);
  return { status: 'in', user, profile, keyStatus, unlocked: unlocked === true };
}

// Which screen the person must see next before using the site.
export function loginStep(s) {
  if (s.status === 'loading') return 'loading';
  if (s.status !== 'in') return 'login';
  if (s.profile.must_change_password) return 'changePassword';
  if (s.profile.role === 'commissioner' && s.keyStatus === 'unset') return 'keySetup';
  if (s.profile.role === 'commissioner' && !s.unlocked) return 'keyUnlock';
  return 'ready';
}

export function useSession() {
  const [session, setSession] = useState({ ...SIGNED_OUT, status: 'loading' });
  const refresh = useCallback(async () => {
    try {
      setSession(await readSession());
    } catch {
      setSession(SIGNED_OUT);
    }
  }, []);
  useEffect(() => {
    refresh();
    // Supabase warns against awaiting inside this callback, so the reload runs on the next tick.
    const { data } = db.auth.onAuthStateChange((event) => {
      if (event !== 'TOKEN_REFRESHED') setTimeout(refresh, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  if (DEMO) return demoSession();
  return { ...session, refresh };
}

export async function signIn(username, password) {
  const { error } = await db.auth.signInWithPassword({ email: emailFor(username), password });
  if (error) throw new Error(error.message.includes('Invalid') ? 'Wrong username or password' : 'Could not reach the league server');
}

export async function signOut(isCommissioner) {
  if (isCommissioner) await db.rpc('lock_commish');
  await db.auth.signOut();
}

export const PASSWORD_MIN = 8;

export async function changePassword(newPassword) {
  if (newPassword.length < PASSWORD_MIN) throw new Error(`Use at least ${PASSWORD_MIN} characters`);
  const { error } = await db.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message.includes('different') ? 'Pick a password different from the temporary one' : error.message);
  const { error: clearError } = await db.rpc('clear_must_change');
  if (clearError) throw new Error(clearError.message);
}
