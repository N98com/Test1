import { useState, type FormEvent } from 'react';
import { AuthScreenLayout } from './AuthScreenLayout';

interface Props {
  onSignIn: (email: string, password: string) => Promise<boolean>;
  error: string | null;
}

export function LoginPage({ onSignIn, error }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSignIn(email.trim(), password);
    setSubmitting(false);
  }

  return (
    <AuthScreenLayout>
      <h1 className="text-center text-lg font-bold text-slate-900 dark:text-slate-100">Productbeheer</h1>
      <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">Log in met je account om verder te gaan.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">E-mailadres</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="naam@bedrijf.nl"
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Wachtwoord</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          {submitting ? 'Bezig met inloggen...' : 'Inloggen'}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Geen account? Vraag de beheerder om er een voor je aan te maken.
      </p>
    </AuthScreenLayout>
  );
}
