'use client';

import { getSizeColors } from '@/lib/shirt-colors';

interface SizeBadgeProps {
  size: string;
  large?: boolean;
}

export function SizeBadge({ size, large = false }: SizeBadgeProps) {
  const { bg, text } = getSizeColors(size);

  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded-lg ${
        large ? 'px-6 py-3 text-xl' : 'px-3 py-1 text-sm'
      }`}
      style={{ backgroundColor: bg, color: text }}
    >
      SHIRT: {size?.toUpperCase() || 'N/A'}
    </span>
  );
}
