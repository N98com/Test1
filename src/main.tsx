import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">Configuratie ontbreekt</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          De koppeling met de database is niet ingesteld (<span className="font-mono">VITE_SUPABASE_URL</span> /{' '}
          <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> ontbreken). Voeg deze toe als GitHub Actions
          secrets (Settings → Secrets and variables → Actions) en start de deploy opnieuw.
        </p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);

if (!url || !anonKey) {
  root.render(<ConfigMissing />);
} else {
  const App = lazy(() => import('./App.tsx'));
  root.render(
    <StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </StrictMode>,
  );
}
