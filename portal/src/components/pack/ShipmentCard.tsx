'use client';

import { useState } from 'react';
import type { Shipment, FlagReason } from '@/lib/pack-types';
import { SizeBadge } from './SizeBadge';
import { AddOnChecklist } from './AddOnChecklist';
import { MergedItemsCard } from './MergedItemsCard';
import { GiftNoteCard } from './GiftNoteCard';
import { FlagModal } from './FlagModal';
import { AddressWarning } from './AddressWarning';

interface ShipmentCardProps {
  shipment: Shipment;
  queuePosition: number;
  totalRemaining: number;
  episodeRemaining?: number;
  nextEpisode?: string;
  onPacked: () => Promise<void>;
  onFlag: (reason: FlagReason) => Promise<void>;
  isLoading?: boolean;
}

export function ShipmentCard({
  shipment,
  queuePosition,
  totalRemaining,
  episodeRemaining,
  nextEpisode,
  onPacked,
  onFlag,
  isLoading = false,
}: ShipmentCardProps) {
  const [checkedAddOns, setCheckedAddOns] = useState<Set<string>>(new Set());
  const [showFlagModal, setShowFlagModal] = useState(false);

  const fields = shipment.fields;
  const isSubscription = fields['Type'] === 'Subscription';
  const firstName = fields['↩️ Subscriber First Name']?.[0] || '';
  const lastName = fields['↩️ Subscriber Last Name']?.[0] || '';
  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
  const city = fields['↩️ City']?.[0] || '';
  const state = fields['↩️ State']?.[0] || '';
  const zip = fields['↩️ Zip']?.[0] || '';
  const shirtSize = fields['↩️ Shirt Size']?.[0] || '';
  const productName = fields['↩️ Product Name']?.[0] || '';
  const sequenceId = fields['↩️ Sequence ID']?.[0];
  const addOns = fields['↩️ Sidecar Names'] || [];
  const mergedItems = fields['⚙️ Merged Items'] || [];
  const manifest = fields['Manifest'] || '';
  const giftNote = fields['✏️ Gift Note'] || '';
  const orderId = fields['⚙️ Shopify Order ID'] || '';

  // Check for incomplete address
  const missingAddressFields: string[] = [];
  if (!city) missingAddressFields.push('City');
  if (!state) missingAddressFields.push('State');
  if (!zip) missingAddressFields.push('Zip');

  const hasIncompleteAddress = missingAddressFields.length > 0;

  // Can pack only if all add-ons are checked (or there are none)
  const canPack = addOns.length === 0 || addOns.every((a) => checkedAddOns.has(a));

  const handleToggleAddOn = (item: string) => {
    setCheckedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const handleFlagConfirm = async (reason: FlagReason) => {
    await onFlag(reason);
    setShowFlagModal(false);
  };

  const handleAddressFlagClick = async () => {
    await onFlag('Address Issue');
  };

  // Progress breadcrumb text
  const progressText = episodeRemaining
    ? `Episode ${sequenceId} (${episodeRemaining} remaining)${nextEpisode ? ` → ${nextEpisode}` : ''}`
    : 'One-Off Orders';

  return (
    <div className="flex flex-col h-full">
      {/* Incomplete address overlay */}
      {hasIncompleteAddress && (
        <AddressWarning
          missingFields={missingAddressFields}
          onFlag={handleAddressFlagClick}
        />
      )}

      {/* Progress header */}
      <div className="bg-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-foreground-secondary text-sm">Progress:</span>
          <span className="text-foreground font-medium">
            {queuePosition} / {totalRemaining}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((queuePosition) / totalRemaining) * 100}%`,
            }}
          />
        </div>
        <div className="text-sm text-foreground-secondary mt-2">
          {progressText}
        </div>
      </div>

      {/* Main card content */}
      <div className="flex-1 overflow-auto px-6 py-8">
        {/* Customer info */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground uppercase">
            {customerName}
          </h1>
          <p className="text-xl text-foreground-secondary mt-1">
            {city}, {state} {zip}
          </p>
        </div>

        {/* Subscription box */}
        {isSubscription ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center mb-6">
            <div className="text-2xl font-bold text-blue-800 mb-2">
              EPISODE {sequenceId}
            </div>
            <div className="text-xl text-blue-700 mb-6">{productName}</div>
            {shirtSize && <SizeBadge size={shirtSize} large />}
          </div>
        ) : (
          /* One-off order */
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-8 text-center mb-6">
            <div className="text-2xl font-bold text-purple-800 mb-4">
              📦 ORDER #{orderId}
            </div>
            {manifest && (
              <div className="text-left space-y-2">
                {manifest.split('\n').map((line, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-purple-700">
                    <span className="text-xl">☐</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add-ons checklist */}
        {addOns.length > 0 && (
          <div className="mb-6">
            <AddOnChecklist
              items={addOns}
              checkedItems={checkedAddOns}
              onToggle={handleToggleAddOn}
            />
          </div>
        )}

        {/* Merged items (for combos) */}
        {mergedItems.length > 0 && manifest && (
          <div className="mb-6">
            <MergedItemsCard manifest={manifest} giftNote={giftNote} />
          </div>
        )}

        {/* Gift note (standalone) */}
        {giftNote && mergedItems.length === 0 && (
          <div className="mb-6">
            <GiftNoteCard note={giftNote} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-6 bg-white border-t border-border flex gap-4">
        <button
          onClick={() => setShowFlagModal(true)}
          disabled={isLoading}
          className="flex-1 py-6 bg-red-500 text-white font-bold text-xl rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          🚩 FLAG
        </button>
        <button
          onClick={onPacked}
          disabled={!canPack || isLoading}
          className="flex-[2] py-6 bg-green-500 text-white font-bold text-xl rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'PROCESSING...' : '✅ PACKED'}
        </button>
      </div>

      {/* Flag modal */}
      <FlagModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        onConfirm={handleFlagConfirm}
        isLoading={isLoading}
      />
    </div>
  );
}
