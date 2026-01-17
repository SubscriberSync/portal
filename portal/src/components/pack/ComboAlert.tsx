'use client';

import type { Combo } from '@/lib/pack-types';

interface ComboAlertProps {
  combos: Combo[];
  onReview: () => void;
}

export function ComboAlert({ combos, onReview }: ComboAlertProps) {
  if (combos.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
          <span>COMBO ALERTS ({combos.length})</span>
        </h3>
        <button
          onClick={onReview}
          className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
        >
          REVIEW
        </button>
      </div>
      <ul className="space-y-2">
        {combos.slice(0, 5).map((combo) => (
          <li key={combo.email} className="text-amber-700">
            <span className="font-medium">{combo.customerName}:</span>{' '}
            {combo.shipments.map((s) => s.name).join(' + ')}
          </li>
        ))}
        {combos.length > 5 && (
          <li className="text-amber-600 italic">
            ...and {combos.length - 5} more
          </li>
        )}
      </ul>
    </div>
  );
}
