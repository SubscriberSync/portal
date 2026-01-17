'use client';

import type { Shipment } from '@/lib/pack-types';

interface OnDeckQueueProps {
  shipments: Shipment[];
}

export function OnDeckQueue({ shipments }: OnDeckQueueProps) {
  const getShipmentLabel = (shipment: Shipment, index: number) => {
    if (index === 0) return 'NEXT';
    return `+${index}`;
  };

  const getEpisodeOrType = (shipment: Shipment) => {
    const type = shipment.fields['Type'];
    const sequenceId = shipment.fields['↩️ Sequence ID']?.[0];

    if (type === 'One-Off') {
      return '📦 One-Off';
    }
    return `Episode ${sequenceId || '?'}`;
  };

  const getCustomerName = (shipment: Shipment) => {
    const firstName = shipment.fields['↩️ Subscriber First Name']?.[0] || '';
    const lastName = shipment.fields['↩️ Subscriber Last Name']?.[0] || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  };

  const getShirtSize = (shipment: Shipment) => {
    return shipment.fields['↩️ Shirt Size']?.[0] || '';
  };

  const hasAddOns = (shipment: Shipment) => {
    const sidecarNames = shipment.fields['↩️ Sidecar Names'] || [];
    const mergedItems = shipment.fields['⚙️ Merged Items'] || [];
    return sidecarNames.length > 0 || mergedItems.length > 0;
  };

  const hasGiftNote = (shipment: Shipment) => {
    return !!shipment.fields['✏️ Gift Note'];
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <table className="w-full">
        <tbody>
          {shipments.map((shipment, index) => (
            <tr
              key={shipment.id}
              className={`border-b border-border last:border-b-0 ${
                index === 0 ? 'bg-green-50' : ''
              }`}
            >
              <td className="px-4 py-3 font-bold text-foreground-secondary w-16">
                {getShipmentLabel(shipment, index)}
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
                  <span className="text-amber-600 text-sm font-medium">
                    ⚠️ ADD-ONS
                  </span>
                )}
                {hasGiftNote(shipment) && (
                  <span className="text-pink-600 text-sm font-medium ml-2">
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
