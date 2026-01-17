'use client';

import { useState } from 'react';
import type { Combo } from '@/lib/pack-types';

interface ComboModalProps {
  combos: Combo[];
  currentIndex: number;
  onClose: () => void;
  onMerge: (primaryId: string, secondaryId: string) => Promise<void>;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ComboModal({
  combos,
  currentIndex,
  onClose,
  onMerge,
  onSkip,
  onNext,
  onPrev,
}: ComboModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const combo = combos[currentIndex];

  if (!combo) return null;

  const subscription = combo.shipments.find((s) => s.type === 'Subscription');
  const oneOff = combo.shipments.find((s) => s.type === 'One-Off');

  const handleMerge = async () => {
    if (!subscription || !oneOff) return;
    setIsLoading(true);
    try {
      await onMerge(subscription.id, oneOff.id);
      if (currentIndex < combos.length - 1) {
        onNext();
      } else {
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShipSeparately = () => {
    if (currentIndex < combos.length - 1) {
      onNext();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            COMBO: {combo.customerName}
          </h2>
          <button
            onClick={onClose}
            className="text-foreground-secondary hover:text-foreground text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-foreground-secondary">
            This customer has {combo.shipments.length} unfulfilled shipments:
          </p>

          {subscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📦</span>
                <span className="font-semibold text-blue-800">SUBSCRIPTION</span>
              </div>
              <div className="text-blue-700">{subscription.name}</div>
            </div>
          )}

          {oneOff && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🛒</span>
                <span className="font-semibold text-purple-800">ONE-OFF ORDER</span>
              </div>
              <div className="text-purple-700">{oneOff.name}</div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 text-sm text-foreground-tertiary">
            <button
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="disabled:opacity-30"
            >
              &larr; Previous
            </button>
            <span>
              {currentIndex + 1} of {combos.length}
            </span>
            <button
              onClick={onNext}
              disabled={currentIndex === combos.length - 1}
              className="disabled:opacity-30"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-4">
          <button
            onClick={handleMerge}
            disabled={isLoading || !subscription || !oneOff}
            className="flex-1 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔗 MERGE INTO ONE
            <div className="text-sm font-normal opacity-80">(1 label)</div>
          </button>
          <button
            onClick={handleShipSeparately}
            disabled={isLoading}
            className="flex-1 py-4 bg-gray-100 text-foreground font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            📦 SHIP SEPARATELY
            <div className="text-sm font-normal opacity-60">(2 labels)</div>
          </button>
        </div>
      </div>
    </div>
  );
}
