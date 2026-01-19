'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePackQueue } from '@/hooks/usePackQueue';
import { useSounds } from '@/hooks/useSounds';
import { markShipmentComplete, flagShipment } from '@/lib/pack-api';
import type { FlagReason } from '@/lib/pack-types';
import { ShipmentCard, BatchSelector } from '@/components/pack';

export default function StationPage() {
  const params = useParams();
  const router = useRouter();
  const clientSlug = params.slug as string;

  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, mutate } = usePackQueue(clientSlug, 5000, selectedBatchId);
  const { play, enableAudio } = useSounds();
  const [actionLoading, setActionLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleEnableAudio = useCallback(() => {
    if (!audioEnabled) {
      enableAudio();
      setAudioEnabled(true);
    }
  }, [audioEnabled, enableAudio]);

  const handlePacked = useCallback(async () => {
    if (!data || data.queue.length === 0) return;

    const currentShipment = data.queue[0];
    setActionLoading(true);

    try {
      if (audioEnabled) {
        play('click');
      }

      const result = await markShipmentComplete(clientSlug, currentShipment.id);

      if (!result.hasMore) {
        // All done!
        router.push(`/portal/${clientSlug}/pack/complete`);
      } else {
        // Refresh queue to show next shipment
        await mutate();
      }
    } catch (error) {
      console.error('Failed to mark shipment complete:', error);
      alert('Failed to mark shipment as packed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }, [data, clientSlug, audioEnabled, play, router, mutate]);

  const handleFlag = useCallback(
    async (reason: FlagReason) => {
      if (!data || data.queue.length === 0) return;

      const currentShipment = data.queue[0];
      setActionLoading(true);

      try {
        const result = await flagShipment(clientSlug, currentShipment.id, reason);

        if (!result.hasMore) {
          // All done!
          router.push(`/portal/${clientSlug}/pack/complete`);
        } else {
          // Refresh queue to show next shipment
          await mutate();
        }
      } catch (error) {
        console.error('Failed to flag shipment:', error);
        alert('Failed to flag shipment. Please try again.');
      } finally {
        setActionLoading(false);
      }
    },
    [data, clientSlug, router, mutate]
  );

  // Enable audio on first interaction
  const handleScreenTap = useCallback(() => {
    handleEnableAudio();
  }, [handleEnableAudio]);

  // Keyboard shortcuts - Enter/Space for Packed, F for Flag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && !actionLoading) {
        e.preventDefault();
        handlePacked();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePacked, actionLoading]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        onClick={handleScreenTap}
      >
        <div className="text-xl text-foreground-secondary">Loading queue...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Failed to load queue</div>
          <button
            onClick={() => router.push(`/portal/${clientSlug}/pack`)}
            className="text-accent hover:underline"
          >
            Return to Pack Prep
          </button>
        </div>
      </div>
    );
  }

  const { queue, stats } = data;

  // No shipments left
  if (queue.length === 0) {
    router.push(`/portal/${clientSlug}/pack/complete`);
    return null;
  }

  const currentShipment = queue[0];

  // Calculate episode remaining count (Supabase format)
  const currentSequenceId = currentShipment.sequence_id;
  const episodeRemaining =
    currentShipment.type === 'Subscription' && currentSequenceId
      ? queue.filter(
          (s) =>
            s.type === 'Subscription' &&
            s.sequence_id === currentSequenceId
        ).length
      : undefined;

  // Find next episode after current one
  const nextEpisodeShipment = currentSequenceId
    ? queue.find(
        (s) =>
          s.type === 'Subscription' &&
          s.sequence_id !== currentSequenceId
      )
    : null;
  const nextEpisode = nextEpisodeShipment
    ? `Episode ${nextEpisodeShipment.sequence_id}`
    : queue.some((s) => s.type === 'One-Off')
      ? 'One-Offs'
      : undefined;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      onClick={handleScreenTap}
    >
      {/* Batch selector */}
      {data.batches && data.batches.length > 0 && (
        <BatchSelector
          batches={data.batches}
          selectedBatchId={selectedBatchId}
          onSelectBatch={setSelectedBatchId}
        />
      )}
      
      <ShipmentCard
        shipment={currentShipment}
        queuePosition={stats.packedToday + 1}
        totalRemaining={stats.total}
        episodeRemaining={episodeRemaining}
        nextEpisode={nextEpisode}
        onPacked={handlePacked}
        onFlag={handleFlag}
        isLoading={actionLoading}
      />
    </div>
  );
}
