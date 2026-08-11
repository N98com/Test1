import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
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
        setLoading(true);
        loadProfile(session.user);
      } else {
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

  return { user, profile, loading, error, signIn, signOut };
}
