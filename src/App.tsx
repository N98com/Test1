import { useState } from 'react';
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
import { AccountsAdmin } from './components/AccountsAdmin';
import type { Profile } from './types';

type Tab = 'overview' | 'intake' | 'outtake' | 'warehouses' | 'products' | 'stickers' | 'history' | 'accounts';

// De tool wordt nu alleen gebruikt voor productbeheer en stickers, niet meer voor
// voorraadbeheer. Deze tabs zijn tijdelijk uit de navigatie gehaald op verzoek, zonder de
// onderliggende schermen te verwijderen. Zet op true om ze weer te tonen.
const SHOW_OVERVIEW_TAB = false;
const SHOW_INTAKE_TAB = false;
const SHOW_OUTTAKE_TAB = false;
const SHOW_WAREHOUSES_TAB = false;
const SHOW_HISTORY_TAB = false;
const SHOW_ACCOUNTS_TAB = false;

function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
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
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
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
