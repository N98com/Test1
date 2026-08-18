import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useInventory } from './useInventory';
import { useTheme } from './useTheme';
import { LoginPage } from './components/LoginPage';
import { SearchView } from './components/SearchView';
import { IntakeForm } from './components/IntakeForm';
import { OutakeForm } from './components/OutakeForm';
import { WarehouseView } from './components/WarehouseView';
import { HistoryView } from './components/HistoryView';
import { ProductsAdmin } from './components/ProductsAdmin';
import { Stickers } from './components/Stickers';
import { Barcodes } from './components/Barcodes';
import { AccountsAdmin } from './components/AccountsAdmin';
import type { Profile } from './types';

type Tab = 'overview' | 'intake' | 'outtake' | 'warehouses' | 'products' | 'stickers' | 'barcodes' | 'history' | 'accounts';

// De tool wordt nu alleen gebruikt voor productbeheer en stickers, niet meer voor
// voorraadbeheer. Deze tabs zijn tijdelijk uit de navigatie gehaald op verzoek, zonder de
// onderliggende schermen te verwijderen. Zet op true om ze weer te tonen.
const SHOW_OVERVIEW_TAB = false;
const SHOW_INTAKE_TAB = false;
const SHOW_OUTTAKE_TAB = false;
const SHOW_WAREHOUSES_TAB = false;
const SHOW_HISTORY_TAB = false;
const SHOW_ACCOUNTS_TAB = false;

function SettingsMenu({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Instellingen"
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Donkere modus</span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={onToggleTheme}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-slate-900 ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">Laden...</p>
    </div>
  );
}

function AuthenticatedApp({
  profile,
  onSignOut,
  theme,
  toggleTheme,
}: {
  profile: Profile;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  const isAdmin = profile.role === 'admin';
  const [tab, setTab] = useState<Tab>('products');
  const {
    companies,
    warehouses,
    products,
    stock,
    movements,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    deleteStock,
    removeStockQuantity,
  } = useInventory(isAdmin);

  const tabs: { id: Tab; label: string }[] = [
    ...(SHOW_OVERVIEW_TAB ? [{ id: 'overview' as Tab, label: 'Overzicht & zoeken' }] : []),
    ...(SHOW_INTAKE_TAB ? [{ id: 'intake' as Tab, label: 'Inboeken' }] : []),
    ...(SHOW_OUTTAKE_TAB ? [{ id: 'outtake' as Tab, label: 'Uitboeken' }] : []),
    ...(SHOW_WAREHOUSES_TAB ? [{ id: 'warehouses' as Tab, label: 'Voorraad' }] : []),
    { id: 'products', label: 'Producten' },
    { id: 'stickers', label: 'Stickers' },
    { id: 'barcodes', label: 'Barcode generator' },
    ...(isAdmin && SHOW_HISTORY_TAB ? [{ id: 'history' as Tab, label: 'Historie' }] : []),
    ...(isAdmin && SHOW_ACCOUNTS_TAB ? [{ id: 'accounts' as Tab, label: 'Accounts' }] : []),
  ];

  async function handleAddStock(productId: string, warehouseId: string, batchNumber: string, quantity: number) {
    const { error } = await addStock({ productId, warehouseId, batchNumber, quantity });
    return error;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">Productbeheer</h1>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Artikelen bijhouden en stickers genereren</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <p className="max-w-[9rem] truncate font-medium text-slate-700 sm:max-w-none dark:text-slate-300">{profile.email}</p>
              <p>{isAdmin ? 'Admin' : 'Gebruiker'}</p>
            </div>
            <SettingsMenu theme={theme} onToggleTheme={toggleTheme} />
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Uitloggen
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Voorraadgegevens laden...</p>
          ) : (
            <>
              {tab === 'overview' && (
                <SearchView products={products} stock={stock} companies={companies} warehouses={warehouses} />
              )}
              {tab === 'intake' && (
                <IntakeForm products={products} warehouses={warehouses} onAddStock={handleAddStock} />
              )}
              {tab === 'outtake' && (
                <OutakeForm products={products} stock={stock} warehouses={warehouses} onRemoveStock={removeStockQuantity} />
              )}
              {tab === 'warehouses' && (
                <WarehouseView
                  products={products}
                  stock={stock}
                  companies={companies}
                  warehouses={warehouses}
                  onDeleteStock={deleteStock}
                />
              )}
              {tab === 'products' && (
                <ProductsAdmin
                  products={products}
                  companies={companies}
                  isAdmin={isAdmin}
                  onAddProduct={addProduct}
                  onUpdateProduct={updateProduct}
                  onDeleteProduct={deleteProduct}
                />
              )}
              {tab === 'stickers' && <Stickers products={products} companies={companies} />}
              {tab === 'barcodes' && <Barcodes products={products} companies={companies} />}
              {tab === 'history' && isAdmin && (
                <HistoryView movements={movements} products={products} companies={companies} warehouses={warehouses} />
              )}
              {tab === 'accounts' && isAdmin && <AccountsAdmin currentUserId={profile.id} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  const { user, profile, loading, error, signIn, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <LoginPage onSignIn={signIn} error={error} />;

  return <AuthenticatedApp profile={profile} onSignOut={signOut} theme={theme} toggleTheme={toggleTheme} />;
}

export default App;
