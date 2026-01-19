'use client';

import { ChevronDown } from 'lucide-react';
import type { PrintBatchInfo } from '@/lib/pack-types';

interface BatchSelectorProps {
  batches: PrintBatchInfo[];
  selectedBatchId: string | undefined;
  onSelectBatch: (batchId: string | undefined) => void;
}

export function BatchSelector({ batches, selectedBatchId, onSelectBatch }: BatchSelectorProps) {
  if (batches.length === 0) {
    return null;
  }

  // Filter to only show batches with remaining items
  const activeBatches = batches.filter(b => b.remaining > 0);
  
  if (activeBatches.length === 0 && !selectedBatchId) {
    return null;
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border-b border-border">
      <span className="text-sm text-foreground-secondary">Batch:</span>
      <div className="relative">
        <select
          value={selectedBatchId || ''}
          onChange={(e) => onSelectBatch(e.target.value || undefined)}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All Batches</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              Batch #{batch.batch_number} ({batch.remaining} remaining)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
      </div>
      
      {selectedBatch && (
        <span className="text-sm text-foreground-tertiary ml-2">
          {selectedBatch.remaining} of {selectedBatch.total_labels} remaining
        </span>
      )}
    </div>
  );
}
