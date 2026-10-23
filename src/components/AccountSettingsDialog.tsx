import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Field } from './Field';

type Feedback = { text: string; type: 'error' | 'success' };

interface Props {
  email: string;
  onClose: () => void;
}

// Loopt via de Edge Function update-account in plaats van supabase.auth.updateUser:
// die laatste stuurt bij een e-mailwijziging een bevestigingsmail, en e-mail
// versturen werkt in dit project niet.
async function updateAccount(body: { currentPassword: string; email?: string; password?: string }) {
  const { data, error } = await supabase.functions.invoke('update-account', { body });
  if (error || data?.error) return (data?.error as string | undefined) ?? error?.message ?? 'Wijzigen is mislukt.';
  return null;
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p className={`rounded-md px-3 py-2 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>
      {feedback.text}
    </p>
  );
}

const submitClass =
  'rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300';

export function AccountSettingsDialog({ email, onClose }: Props) {
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<Feedback | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailFeedback(null);

    const trimmed = newEmail.trim();
    if (!trimmed.includes('@')) {
      setEmailFeedback({ text: 'Vul een geldig e-mailadres in.', type: 'error' });
      return;
    }
    if (trimmed.toLowerCase() === email.toLowerCase()) {
      setEmailFeedback({ text: 'Dit is al je huidige e-mailadres.', type: 'error' });
      return;
    }

    setEmailBusy(true);
    const error = await updateAccount({ currentPassword: emailCurrentPassword, email: trimmed });
    if (!error) {
      // Sessie vernieuwen zodat het nieuwe e-mailadres overal in de app zichtbaar wordt
      // (useAuth laadt het profiel opnieuw bij een token-refresh).
      await supabase.auth.refreshSession();
    }
    setEmailBusy(false);

    if (error) {
      setEmailFeedback({ text: error, type: 'error' });
      return;
    }
    setEmailFeedback({ text: `E-mailadres gewijzigd naar ${trimmed}. Log voortaan hiermee in.`, type: 'success' });
    setNewEmail('');
    setEmailCurrentPassword('');
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ text: 'Wachtwoord moet minimaal 6 tekens zijn.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ text: 'Wachtwoorden komen niet overeen.', type: 'error' });
      return;
    }

    setPasswordBusy(true);
    const error = await updateAccount({ currentPassword, password: newPassword });
    setPasswordBusy(false);

    if (error) {
      setPasswordFeedback({ text: error, type: 'error' });
      return;
    }
    setPasswordFeedback({ text: 'Wachtwoord gewijzigd.', type: 'success' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mx-auto mt-8 max-w-md space-y-4 rounded-xl bg-white p-5 shadow-lg dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mijn account</h2>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sluiten
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">E-mailadres wijzigen</h3>
          <Field label="Nieuw e-mailadres">
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input" required />
          </Field>
          <Field label="Huidig wachtwoord">
            <input
              type="password"
              value={emailCurrentPassword}
              onChange={(e) => setEmailCurrentPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
              required
            />
          </Field>
          <FeedbackMessage feedback={emailFeedback} />
          <button type="submit" disabled={emailBusy} className={submitClass}>
            {emailBusy ? 'Bezig...' : 'E-mailadres opslaan'}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Wachtwoord wijzigen</h3>
          <Field label="Huidig wachtwoord">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nieuw wachtwoord">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Min. 6 tekens"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>
          <Field label="Bevestig nieuw wachtwoord">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              autoComplete="new-password"
              required
            />
          </Field>
          <FeedbackMessage feedback={passwordFeedback} />
          <button type="submit" disabled={passwordBusy} className={submitClass}>
            {passwordBusy ? 'Bezig...' : 'Wachtwoord opslaan'}
          </button>
        </form>
      </div>
    </div>
  );
}
