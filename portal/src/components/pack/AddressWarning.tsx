'use client';

interface AddressWarningProps {
  missingFields: string[];
  onFlag: () => void;
}

export function AddressWarning({ missingFields, onFlag }: AddressWarningProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          ADDRESS INCOMPLETE
        </h2>
        <p className="text-foreground-secondary mb-6">
          Missing: {missingFields.join(', ')}
        </p>
        <p className="text-foreground-secondary mb-8">
          This shipment must be flagged.
        </p>
        <button
          onClick={onFlag}
          className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors text-lg"
        >
          🚩 FLAG AS ADDRESS ISSUE
        </button>
      </div>
    </div>
  );
}
