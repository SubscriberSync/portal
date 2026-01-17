'use client';

interface MergedItemsCardProps {
  manifest: string;
  giftNote?: string;
}

export function MergedItemsCard({ manifest, giftNote }: MergedItemsCardProps) {
  // Parse manifest (assumes it's a rich text field with line-separated items)
  const items = manifest
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean) || [];

  if (items.length === 0) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📦</span>
        <span className="font-semibold text-purple-800">
          ALSO INCLUDE (merged order)
        </span>
      </div>
      <ul className="space-y-1 mb-3">
        {items.map((item, idx) => (
          <li key={idx} className="text-purple-700 flex items-center gap-2">
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {giftNote && (
        <div className="pt-3 border-t border-purple-200">
          <div className="flex items-center gap-2 text-pink-700">
            <span>🎁</span>
            <span className="italic">&ldquo;{giftNote}&rdquo;</span>
          </div>
        </div>
      )}
    </div>
  );
}
