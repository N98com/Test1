import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile, Role } from '../types';
import { Field } from './Field';

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

type Feedback = { text: string; type: 'error' | 'success' };

interface Props {
  currentUserId: string;
}

export function AccountsAdmin({ currentUserId }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('user');
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<Feedback | null>(null);

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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateFeedback(null);

    const email = newEmail.trim();
    if (!email || !email.includes('@')) {
      setCreateFeedback({ text: 'Vul een geldig e-mailadres in.', type: 'error' });
      return;
    }

    setCreating(true);
    const { data, error: invokeError } = await supabase.functions.invoke('create-account', {
      body: { email, role: newRole },
    });
    setCreating(false);

    if (invokeError || data?.error) {
      setCreateFeedback({ text: data?.error ?? invokeError?.message ?? 'Aanmaken is mislukt.', type: 'error' });
      return;
    }

    setCreateFeedback({ text: `Uitnodiging verstuurd naar ${email}.`, type: 'success' });
    setNewEmail('');
    setNewRole('user');
    fetchProfiles();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Nieuw account toevoegen</h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="E-mailadres">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="input"
              placeholder="collega@bedrijf.nl"
              required
            />
          </Field>
          <Field label="Rol">
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="input">
              <option value="user">Gebruiker</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {creating ? 'Bezig...' : 'Account aanmaken'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          De nieuwe collega krijgt een e-mail om zelf een wachtwoord in te stellen.
        </p>
        {createFeedback && (
          <p className={`mt-3 rounded-md px-3 py-2 text-sm ${createFeedback.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>
            {createFeedback.text}
          </p>
        )}
      </form>

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
