import React from 'react';
import { Store } from 'lucide-react';

interface WarehouseAvailabilityProps {
  whStock: number;
  requested: number;
}

export function WarehouseAvailability({ whStock, requested }: WarehouseAvailabilityProps) {
  const fulfillment = Math.min(whStock, requested);
  const procurement = Math.max(0, requested - whStock);

  let statusText = 'Full Warehouse Fulfillment';
  let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (requested > 0) {
    if (fulfillment === 0) {
      statusText = 'Full Procurement Required';
      statusBg = 'bg-rose-50 text-rose-700 border-rose-100';
    } else if (procurement > 0) {
      statusText = 'Partial Fulfillment Required';
      statusBg = 'bg-amber-50 text-amber-700 border-amber-100';
    }
  } else {
    statusText = 'Enter Quantity';
    statusBg = 'bg-slate-50 text-slate-500 border-slate-100';
  }

  return (
    <div className="mt-3 bg-white p-4 rounded-xl border border-teal-100 shadow-sm">
      <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Store className="w-4 h-4" />
        Warehouse Availability Status
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-medium text-slate-500">
        <div>
          <span className="block text-slate-400">Warehouse Stock</span>
          <span className="font-mono font-bold text-slate-900 text-lg">{whStock}</span>
        </div>
        <div>
          <span className="block text-slate-400">Requested</span>
          <span className="font-mono font-bold text-slate-900 text-lg">{requested}</span>
        </div>
        <div>
          <span className="block text-slate-400">Warehouse Fulfillment</span>
          <span className="font-mono font-bold text-teal-600 text-lg">{fulfillment}</span>
        </div>
        <div>
          <span className="block text-slate-400">Need Procurement</span>
          <span className="font-mono font-bold text-amber-600 text-lg">{procurement}</span>
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
          <span className={`inline-flex px-3 py-1.5 rounded-lg border text-xs font-bold ${statusBg}`}>
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
}
