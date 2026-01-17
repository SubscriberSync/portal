'use client';

import type { ShipmentGroup } from '@/lib/pack-types';

interface GroupCardProps {
  group: ShipmentGroup;
}

export function GroupCard({ group }: GroupCardProps) {
  const isOneOff = group.type === 'one-off';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <div className="text-lg font-semibold text-foreground">{group.name}</div>
      <div className="text-3xl font-bold text-foreground mt-2">
        {group.count}{' '}
        <span className="text-lg font-normal text-foreground-secondary">
          {isOneOff ? 'orders' : 'boxes'}
        </span>
      </div>
    </div>
  );
}
