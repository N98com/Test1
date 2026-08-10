import { useState } from 'react';
import { COMPANIES, WAREHOUSES } from './data/seed';
import { useInventory } from './useInventory';
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
        className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'single' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
      >
        Eén artikel
      </button>
      <button
        type="button"
        onClick={() => onChange('bulk')}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === 'bulk' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
      >
        Bulk (meerdere artikelen)
      </button>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [intakeMode, setIntakeMode] = useState<Mode>('single');
  const [outtakeMode, setOuttakeMode] = useState<Mode>('single');
  const { products, stock, movements, addProduct, addStock, deleteStock, removeStockQuantity } = useInventory();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-bold text-slate-900">Voorraadbeheer — LISL &amp; EB</h1>
          <p className="text-sm text-slate-500">Voorraad over 4 magazijnen per artikelnummer en EAN</p>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
