import type { ReactNode } from 'react';

export function AppLogo() {
  return (
    <div className="mb-5 flex justify-center">
      <svg viewBox="0 0 24 24" width="72" height="72" className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
        <circle cx="12" cy="12" r="11" fill="#000" />
        <circle cx="12" cy="12" r="11" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.5" />
        <path
          fill="#fff"
          d="M12 5.5c-2.8 0-5 2.2-5 5 0 1.9 1.1 3.5 2.6 4.3.3.2.4.4.4.7v.8h4v-.8c0-.3.1-.5.4-.7 1.5-.8 2.6-2.4 2.6-4.3 0-2.8-2.2-5-5-5z"
        />
        <path fill="#000" d="M13 8l-3.2 4.2h2l-1 3.3L14 11h-2l1-3z" />
        <rect x="10" y="16.6" width="4" height="1.1" rx="0.3" fill="#fff" />
        <rect x="10.3" y="18" width="3.4" height="1" rx="0.3" fill="#fff" />
      </svg>
    </div>
  );
}

// Gedeelde omlijsting voor de twee "buiten de app"-schermen (inloggen, wachtwoord
// instellen na een uitnodiging), zodat beide schermen er hetzelfde uitzien.
export function AuthScreenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <AppLogo />
        {children}
      </div>
    </div>
  );
}
