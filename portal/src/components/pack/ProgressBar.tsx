'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  current,
  total,
  showLabels = true,
  size = 'md',
}: ProgressBarProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  const heightClass = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  }[size];

  return (
    <div className="w-full">
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClass}`}
      >
        <div
          className="h-full bg-green-500 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-center mt-2 text-2xl font-bold text-foreground">
          {current} / {total}
        </div>
      )}
    </div>
  );
}
