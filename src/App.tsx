import { useState } from 'react';
import { COMPANIES, WAREHOUSES } from './data/seed';
import { useInventory } from './useInventory';
import { SearchView } from './components/SearchView';
import { StockForm } from './components/StockForm';
import { StockOutForm } from './components/StockOutForm';
import { WarehouseView } from './components/WarehouseView';

type Tab = 'overview' | 'intake' | 'outtake' | 'warehouses';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overzicht & zoeken' },
  { id: 'intake', label: 'Artikel toevoegen / inboeken' },
  { id: 'outtake', label: 'Uitboeken' },
  { id: 'warehouses', label: 'Magazijnen' },
];

function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const { products, stock, addProduct, addStock, deleteStock, removeStockQuantity } = useInventory();

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
            <StockForm
              products={products}
              companies={COMPANIES}
              warehouses={WAREHOUSES}
              onAddProduct={addProduct}
              onAddStock={(productId, warehouseId, batchNumber, quantity) =>
                addStock({ productId, warehouseId, batchNumber, quantity })
              }
            />
          )}
          {tab === 'outtake' && (
            <StockOutForm
              products={products}
              stock={stock}
              companies={COMPANIES}
              warehouses={WAREHOUSES}
              onRemoveStock={removeStockQuantity}
            />
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
        </div>
      </main>
    </div>
  );
}

export default App;
