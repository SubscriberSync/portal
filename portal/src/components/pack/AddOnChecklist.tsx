'use client';

interface AddOnChecklistProps {
  items: string[];
  checkedItems: Set<string>;
  onToggle: (item: string) => void;
}

export function AddOnChecklist({
  items,
  checkedItems,
  onToggle,
}: AddOnChecklistProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <span className="font-semibold text-amber-800">
          ADD-ONS (tap each to confirm)
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const isChecked = checkedItems.has(item);
          return (
            <li key={item}>
              <button
                onClick={() => onToggle(item)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  isChecked
                    ? 'bg-green-100 text-green-800'
                    : 'bg-white text-amber-700 hover:bg-amber-100'
                }`}
              >
                <span className="text-xl">{isChecked ? '☑' : '☐'}</span>
                <span>{item}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
