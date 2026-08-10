import { useState } from 'react';
import { COMPANIES, WAREHOUSES } from './data/seed';
import { useInventory } from './useInventory';
import { useTheme } from './useTheme';
import { SearchView } from './components/SearchView';
import { StockForm } from './components/StockForm';
import { BulkIntakeForm } from './components/BulkIntakeForm';
import { StockOutForm } from './components/StockOutForm';
import { BulkOutakeForm } from './components/BulkOutakeForm';
import { WarehouseView } from './components/WarehouseView';
import { HistoryView } from './components/HistoryView';

type Tab = 'overview' | 'intake' | 'outtake' | 'warehouses' | 'history';
type Mode = 'single' | 'bulk';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overzicht & zoeken' },
  { id: 'intake', label: 'Artikel toevoegen / inboeken' },
  { id: 'outtake', label: 'Uitboeken' },
  { id: 'warehouses', label: 'Magazijnen' },
  { id: 'history', label: 'Historie' },
];

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="mb-6 flex gap-2">
      <button
        type="button"
        onClick={() => onChange('single')}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${
          mode === 'single'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
      >
        Eén artikel
      </button>
      <button
        type="button"
        onClick={() => onChange('bulk')}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${
          mode === 'bulk'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
      >
        Bulk (meerdere artikelen)
      </button>
    </div>
  );
}

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

function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [intakeMode, setIntakeMode] = useState<Mode>('single');
  const [outtakeMode, setOuttakeMode] = useState<Mode>('single');
  const { products, stock, movements, addProduct, addStock, deleteStock, removeStockQuantity } = useInventory();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">Voorraadbeheer — LISL &amp; EB</h1>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Voorraad over 4 magazijnen per artikelnummer en EAN</p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
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
          {tab === 'overview' && (
            <SearchView products={products} stock={stock} companies={COMPANIES} warehouses={WAREHOUSES} />
          )}
          {tab === 'intake' && (
            <>
              <ModeToggle mode={intakeMode} onChange={setIntakeMode} />
              {intakeMode === 'single' ? (
                <StockForm
                  products={products}
                  companies={COMPANIES}
                  warehouses={WAREHOUSES}
                  onAddProduct={addProduct}
                  onAddStock={(productId, warehouseId, batchNumber, quantity) =>
                    addStock({ productId, warehouseId, batchNumber, quantity })
                  }
                />
              ) : (
                <BulkIntakeForm
                  products={products}
                  warehouses={WAREHOUSES}
                  onAddStock={(productId, warehouseId, batchNumber, quantity) =>
                    addStock({ productId, warehouseId, batchNumber, quantity })
                  }
                />
              )}
            </>
          )}
          {tab === 'outtake' && (
            <>
              <ModeToggle mode={outtakeMode} onChange={setOuttakeMode} />
              {outtakeMode === 'single' ? (
                <StockOutForm
                  products={products}
                  stock={stock}
                  companies={COMPANIES}
                  warehouses={WAREHOUSES}
                  onRemoveStock={removeStockQuantity}
                />
              ) : (
                <BulkOutakeForm
                  products={products}
                  stock={stock}
                  warehouses={WAREHOUSES}
                  onRemoveStock={removeStockQuantity}
                />
              )}
            </>
          )}
          {tab === 'warehouses' && (
            <WarehouseView
              products={products}
              stock={stock}
              companies={COMPANIES}
              warehouses={WAREHOUSES}
              onDeleteStock={deleteStock}
            />
          )}
          {tab === 'history' && (
            <HistoryView movements={movements} products={products} companies={COMPANIES} warehouses={WAREHOUSES} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
