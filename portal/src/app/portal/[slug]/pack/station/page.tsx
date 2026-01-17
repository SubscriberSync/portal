'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePackQueue } from '@/hooks/usePackQueue';
import { useSounds } from '@/hooks/useSounds';
import { markShipmentComplete, flagShipment } from '@/lib/pack-api';
import type { FlagReason } from '@/lib/pack-types';
import { ShipmentCard } from '@/components/pack';

export default function StationPage() {
  const params = useParams();
  const router = useRouter();
  const clientSlug = params.slug as string;

  const { data, isLoading, isError, mutate } = usePackQueue(clientSlug, 5000);
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

      if (!result.next) {
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

        if (!result.next) {
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

  // Calculate episode remaining count
  const currentSequenceId = currentShipment.fields['↩️ Sequence ID']?.[0];
  const episodeRemaining =
    currentShipment.fields['Type'] === 'Subscription' && currentSequenceId
      ? queue.filter(
          (s) =>
            s.fields['Type'] === 'Subscription' &&
            s.fields['↩️ Sequence ID']?.[0] === currentSequenceId
        ).length
      : undefined;

  // Find next episode after current one
  const nextEpisodeShipment = currentSequenceId
    ? queue.find(
        (s) =>
          s.fields['Type'] === 'Subscription' &&
          s.fields['↩️ Sequence ID']?.[0] !== currentSequenceId
      )
    : null;
  const nextEpisode = nextEpisodeShipment
    ? `Episode ${nextEpisodeShipment.fields['↩️ Sequence ID']?.[0]}`
    : queue.some((s) => s.fields['Type'] === 'One-Off')
      ? 'One-Offs'
      : undefined;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      onClick={handleScreenTap}
    >
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
