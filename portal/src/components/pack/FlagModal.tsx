'use client';

import { useState } from 'react';
import type { FlagReason } from '@/lib/pack-types';

const FLAG_REASONS: FlagReason[] = [
  'Out of Stock',
  'Address Issue',
  'Customer Request',
  'Damaged Item',
  'Other',
];

interface FlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: FlagReason) => void;
  isLoading?: boolean;
}

export function FlagModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: FlagModalProps) {
  const [selectedReason, setSelectedReason] = useState<FlagReason | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Flag Shipment</h2>
          <button
            onClick={onClose}
            className="text-foreground-secondary hover:text-foreground text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          <p className="text-foreground-secondary mb-4">Select reason:</p>

          <div className="space-y-2">
            {FLAG_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedReason === reason
                    ? 'bg-red-50 border-2 border-red-300'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <input
                  type="radio"
                  name="flagReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="w-5 h-5 text-red-500"
                />
                <span className="text-foreground">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={!selectedReason || isLoading}
            className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'FLAGGING...' : 'CONFIRM FLAG'}
          </button>
        </div>
      </div>
    </div>
  );
}
