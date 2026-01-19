'use client';

import type { PackShipment } from '@/lib/pack-types';

interface OnDeckQueueProps {
  shipments: PackShipment[];
}

export function OnDeckQueue({ shipments }: OnDeckQueueProps) {
  const getShipmentLabel = (index: number) => {
    if (index === 0) return 'NEXT';
    return `+${index}`;
  };

  const getEpisodeOrType = (shipment: PackShipment) => {
    if (shipment.type === 'One-Off') {
      return '📦 One-Off';
    }
    return `Episode ${shipment.sequence_id || '?'}`;
  };

  const getCustomerName = (shipment: PackShipment) => {
    const firstName = shipment.subscriber?.first_name || '';
    const lastName = shipment.subscriber?.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  };

  const getShirtSize = (shipment: PackShipment) => {
    return shipment.subscriber?.shirt_size || '';
  };

  const hasAddOns = (shipment: PackShipment) => {
    return (shipment.merged_items && shipment.merged_items.length > 0) ||
           (shipment.merged_shipment_ids && shipment.merged_shipment_ids.length > 0);
  };

  const hasGiftNote = (shipment: PackShipment) => {
    return !!shipment.gift_note;
  };

  return (
    <div className="bg-surface rounded-xl overflow-hidden shadow-sm">
      <table className="w-full">
        <tbody>
          {shipments.map((shipment, index) => (
            <tr
              key={shipment.id}
              className={`border-b border-border last:border-b-0 ${
                index === 0 ? 'bg-green-50 dark:bg-green-950/30' : ''
              }`}
            >
              <td className="px-4 py-3 font-bold text-foreground-secondary w-16">
                {getShipmentLabel(index)}
              </td>
              <td className="px-4 py-3 text-foreground">
                {getEpisodeOrType(shipment)}
              </td>
              <td className="px-4 py-3 text-foreground font-medium">
                {getCustomerName(shipment)}
              </td>
              <td className="px-4 py-3 text-foreground-secondary w-16 text-center">
                {getShirtSize(shipment)}
              </td>
              <td className="px-4 py-3 w-32 text-right">
                {hasAddOns(shipment) && (
                  <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                    ⚠️ ADD-ONS
                  </span>
                )}
                {hasGiftNote(shipment) && (
                  <span className="text-pink-600 dark:text-pink-400 text-sm font-medium ml-2">
                    🎁 GIFT NOTE
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
