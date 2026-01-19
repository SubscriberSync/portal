'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePackOverview } from '@/hooks/usePackOverview';
import { mergeShipments } from '@/lib/pack-api';
import { GroupCard, ComboAlert, ComboModal, PrintSelector } from '@/components/pack';

export default function PackPrepPage() {
  const params = useParams();
  const router = useRouter();
  const clientSlug = params.slug as string;

  const { data, isLoading, isError, mutate } = usePackOverview(clientSlug);
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboIndex, setComboIndex] = useState(0);
  const [shopifyStore, setShopifyStore] = useState<string | undefined>(undefined);

  // Fetch Shopify store from overview (if available)
  useEffect(() => {
    if (data && 'shopifyStore' in data) {
      setShopifyStore((data as { shopifyStore?: string }).shopifyStore);
    }
  }, [data]);

  const handleOpenComboReview = () => {
    setComboIndex(0);
    setShowComboModal(true);
  };

  const handleMerge = async (primaryId: string, secondaryId: string) => {
    await mergeShipments(clientSlug, primaryId, secondaryId);
    await mutate();
  };

  const handleStartPacking = () => {
    router.push(`/portal/${clientSlug}/pack/station`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-foreground-secondary">Loading...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Failed to load pack overview</div>
          <Link
            href={`/portal/${clientSlug}`}
            className="text-accent hover:underline"
          >
            Return to Portal
          </Link>
        </div>
      </div>
    );
  }

  const subscriptionGroups = data.groups.filter((g) => g.type === 'subscription');
  const oneOffGroup = data.groups.find((g) => g.type === 'one-off');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/portal/${clientSlug}`}
              className="text-foreground-secondary hover:text-foreground"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold text-foreground">PACK MODE</h1>
          </div>
          <button
            onClick={handleStartPacking}
            className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
          >
            Start Packing
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Combo alerts */}
        {data.combos.length > 0 && (
          <ComboAlert combos={data.combos} onReview={handleOpenComboReview} />
        )}

        {/* Subscription groups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptionGroups.map((group) => (
            <GroupCard key={group.key} group={group} />
          ))}
        </div>

        {/* One-off group */}
        {oneOffGroup && oneOffGroup.count > 0 && (
          <GroupCard group={oneOffGroup} />
        )}

        {/* Print selector */}
        <PrintSelector
          clientSlug={clientSlug}
          shopifyStore={shopifyStore}
        />

        {/* Summary footer */}
        <div className="text-center text-foreground-secondary">
          Total: {data.totalShipments} shipments
          {data.comboCount > 0 && ` • ${data.comboCount} combos detected`}
        </div>
      </div>

      {/* Combo modal */}
      {showComboModal && data.combos.length > 0 && (
        <ComboModal
          combos={data.combos}
          currentIndex={comboIndex}
          onClose={() => setShowComboModal(false)}
          onMerge={handleMerge}
          onSkip={() => {
            if (comboIndex < data.combos.length - 1) {
              setComboIndex((i) => i + 1);
            } else {
              setShowComboModal(false);
            }
          }}
          onNext={() => setComboIndex((i) => Math.min(i + 1, data.combos.length - 1))}
          onPrev={() => setComboIndex((i) => Math.max(i - 1, 0))}
        />
      )}
    </div>
  );
}
