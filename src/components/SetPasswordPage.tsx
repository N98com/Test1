import { useState, type FormEvent } from 'react';
import { AuthScreenLayout } from './AuthScreenLayout';

interface Props {
  email: string;
  error: string | null;
  onSetPassword: (password: string) => Promise<boolean>;
}

export function SetPasswordPage({ email, error, onSetPassword }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMismatchError(null);

    if (password.length < 6) {
      setMismatchError('Wachtwoord moet minimaal 6 tekens zijn.');
      return;
    }
    if (password !== confirmPassword) {
      setMismatchError('Wachtwoorden komen niet overeen.');
      return;
    }

    setSubmitting(true);
    await onSetPassword(password);
    setSubmitting(false);
  }

  return (
    <AuthScreenLayout>
      <h1 className="text-center text-lg font-bold text-slate-900 dark:text-slate-100">Welkom bij Label Generator</h1>
      <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Stel een wachtwoord in voor <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span> om je
        account te activeren.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nieuw wachtwoord</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Bevestig wachtwoord</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </label>

        {(mismatchError || error) && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">
            {mismatchError ?? error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          {submitting ? 'Bezig...' : 'Wachtwoord instellen'}
        </button>
      </form>
    </AuthScreenLayout>
  );
}
