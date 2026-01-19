'use client';

import { useState } from 'react';
import type { PackShipment, FlagReason } from '@/lib/pack-types';
import { SizeBadge } from './SizeBadge';
import { AddOnChecklist } from './AddOnChecklist';
import { MergedItemsCard } from './MergedItemsCard';
import { GiftNoteCard } from './GiftNoteCard';
import { FlagModal } from './FlagModal';
import { AddressWarning } from './AddressWarning';

interface ShipmentCardProps {
  shipment: PackShipment;
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

  // Extract data from Supabase format
  const isSubscription = shipment.type === 'Subscription';
  const subscriber = shipment.subscriber;
  const firstName = subscriber?.first_name || '';
  const lastName = subscriber?.last_name || '';
  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
  const city = subscriber?.city || '';
  const state = subscriber?.state || '';
  const zip = subscriber?.zip || '';
  const shirtSize = subscriber?.shirt_size || '';
  const productName = shipment.product_name || '';
  const sequenceId = shipment.sequence_id;
  const giftNote = shipment.gift_note || '';
  const orderNumber = shipment.order_number || shipment.shopify_order_id || '';
  
  // Merged items from the API
  const mergedItems = shipment.merged_items || [];
  const hasMergedItems = mergedItems.length > 0;
  
  // Build manifest from merged items
  const manifest = hasMergedItems 
    ? mergedItems.map(item => item.product_name || 'Item').join('\n')
    : '';

  // Check if this is a ghost order (external fulfillment)
  const isExternalLabel = !!shipment.external_fulfillment_source;

  // Check for incomplete address
  const missingAddressFields: string[] = [];
  if (!city) missingAddressFields.push('City');
  if (!state) missingAddressFields.push('State');
  if (!zip) missingAddressFields.push('Zip');

  const hasIncompleteAddress = missingAddressFields.length > 0;

  // For now, merged items act as the "add-ons" checklist
  const addOns = mergedItems.map(item => item.product_name || 'Item');
  
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
      <div className="bg-surface-secondary px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-foreground-secondary text-sm">Progress:</span>
          <span className="text-foreground font-medium">
            {queuePosition} / {totalRemaining}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
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
      <div className="flex-1 overflow-auto px-6 py-8 bg-background">
        {/* External Label Warning */}
        {isExternalLabel && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-bold text-yellow-800 dark:text-yellow-300">EXTERNAL LABEL</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                Label was purchased outside SubscriberSync. Verify physical label exists.
              </div>
            </div>
          </div>
        )}

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
          <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center mb-6">
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-2">
              EPISODE {sequenceId}
            </div>
            <div className="text-xl text-blue-700 dark:text-blue-400 mb-6">{productName}</div>
            {shirtSize && <SizeBadge size={shirtSize} large />}
          </div>
        ) : (
          /* One-off order */
          <div className="bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-8 text-center mb-6">
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-300 mb-4">
              📦 ORDER #{orderNumber}
            </div>
            <div className="text-lg text-purple-700 dark:text-purple-400">
              {productName}
            </div>
          </div>
        )}

        {/* Add-ons checklist (merged items) */}
        {addOns.length > 0 && (
          <div className="mb-6">
            <AddOnChecklist
              items={addOns}
              checkedItems={checkedAddOns}
              onToggle={handleToggleAddOn}
            />
          </div>
        )}

        {/* Merged items display (for combos) */}
        {hasMergedItems && (
          <div className="mb-6">
            <MergedItemsCard 
              manifest={manifest} 
              giftNote={mergedItems.find(i => i.gift_note)?.gift_note || ''} 
            />
          </div>
        )}

        {/* Gift note (standalone) */}
        {giftNote && !hasMergedItems && (
          <div className="mb-6">
            <GiftNoteCard note={giftNote} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-6 bg-surface border-t border-border flex gap-4">
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
