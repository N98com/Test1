import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile, Role } from '../types';

interface ProfileRow {
  id: string;
  email: string;
  role: Role;
  created_at: string;
}

const mapProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  currentUserId: string;
}

export function AccountsAdmin({ currentUserId }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchProfiles() {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at');

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setProfiles((data as ProfileRow[]).map(mapProfile));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProfiles();

    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfiles())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function changeRole(id: string, role: Role) {
    setError(null);
    setUpdatingId(id);
    const { error: updateError } = await supabase.from('profiles').update({ role }).eq('id', id);
    setUpdatingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">Nieuw account toevoegen</p>
        <p>
          Ga naar je Supabase-dashboard → <span className="font-mono">Authentication</span> →{' '}
          <span className="font-mono">Users</span> → <span className="font-mono">"Invite user"</span> en vul het
          e-mailadres in. De nieuwe gebruiker krijgt een e-mail om zelf een wachtwoord in te stellen en verschijnt
          daarna automatisch hieronder met rol "Gebruiker" — die kun je hier aanpassen.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Laden...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[480px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">E-mail</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Aangemaakt op</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {profiles.map((profile) => {
                const isSelf = profile.id === currentUserId;
                return (
                  <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {profile.email}
                      {isSelf && <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">(jij)</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{formatDate(profile.createdAt)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={profile.role}
                        onChange={(e) => changeRole(profile.id, e.target.value as Role)}
                        disabled={isSelf || updatingId === profile.id}
                        className="input w-auto disabled:cursor-not-allowed disabled:opacity-60"
                        title={isSelf ? 'Je kunt je eigen rol niet wijzigen' : undefined}
                      >
                        <option value="user">Gebruiker</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
