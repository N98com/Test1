import { useState, type FormEvent } from 'react';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Welkom bij Productbeheer</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
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
      </div>
    </div>
  );
}
