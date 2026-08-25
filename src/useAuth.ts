import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { initialAuthRedirectType } from './lib/authRedirectType';
import type { Profile } from './types';

interface ProfileRow {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return { id: row.id, email: row.email, role: row.role, createdAt: row.created_at };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Een net binnengekomen uitnodigingslink logt de gebruiker meteen in, maar die heeft
  // dan nog nooit zelf een wachtwoord gekozen: in dat geval eerst het wachtwoord-
  // instelscherm tonen in plaats van meteen de app.
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(initialAuthRedirectType === 'invite');
  const [passwordSetupError, setPasswordSetupError] = useState<string | null>(null);
  const knownUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(currentUser: User) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('id', currentUser.id)
        .single();

      if (cancelled) return;

      if (profileError || !data) {
        setError('Kon accountgegevens niet laden. Probeer opnieuw in te loggen.');
        setProfile(null);
      } else {
        setProfile(mapProfile(data as ProfileRow));
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        knownUserIdRef.current = session.user.id;
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setError(null);

      if (session?.user) {
        // Supabase fires this on every background token refresh too (e.g. when the
        // browser tab regains focus), not just on sign-in. Only show the loading screen
        // for a genuine sign-in transition, otherwise AuthenticatedApp unmounts and
        // remounts on every tab switch, resetting the current tab and any in-progress work.
        const isNewSignIn = knownUserIdRef.current !== session.user.id;
        knownUserIdRef.current = session.user.id;
        if (isNewSignIn) {
          setLoading(true);
        }
        loadProfile(session.user);
      } else {
        knownUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('E-mailadres of wachtwoord onjuist.');
    }
    return !signInError;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function completePasswordSetup(password: string) {
    setPasswordSetupError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPasswordSetupError(updateError.message);
      return false;
    }
    setNeedsPasswordSetup(false);
    return true;
  }

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    needsPasswordSetup,
    passwordSetupError,
    completePasswordSetup,
  };
}
