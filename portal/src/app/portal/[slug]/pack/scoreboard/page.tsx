'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePackQueue } from '@/hooks/usePackQueue';
import { useSounds } from '@/hooks/useSounds';
import { ProgressBar, OnDeckQueue } from '@/components/pack';

export default function ScoreboardPage() {
  const params = useParams();
  const clientSlug = params.slug as string;

  const { data, isLoading, isError } = usePackQueue(clientSlug, 3000);
  const { play, enableAudio } = useSounds();
  const [audioEnabled, setAudioEnabled] = useState(false);

  const prevPackedRef = useRef<number | null>(null);
  const prevTotalRef = useRef<number | null>(null);

  // Handle sound effects based on state changes
  useEffect(() => {
    if (!data || !audioEnabled) return;

    const currentPacked = data.stats.packedToday;
    const currentTotal = data.stats.total;
    const prevPacked = prevPackedRef.current;
    const prevTotal = prevTotalRef.current;

    // Check for milestone sounds
    if (prevPacked !== null && currentPacked > prevPacked) {
      // Level up every 10 boxes
      if (currentPacked % 10 === 0) {
        play('levelUp');
      }
      // Fanfare when batch is complete
      if (currentTotal === 0) {
        play('fanfare');
      }
    }

    // Alert when items get flagged (total suddenly decreases without packed increasing)
    if (
      prevTotal !== null &&
      prevPacked !== null &&
      currentTotal < prevTotal &&
      currentPacked === prevPacked
    ) {
      play('alert');
    }

    prevPackedRef.current = currentPacked;
    prevTotalRef.current = currentTotal;
  }, [data, audioEnabled, play]);

  const handleEnableAudio = () => {
    enableAudio();
    setAudioEnabled(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-foreground">Loading...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-red-400">Failed to load queue</div>
      </div>
    );
  }

  const { queue, stats } = data;
  const progress = stats.packedToday;
  const total = stats.total + stats.packedToday; // Total for the day

  // Format estimated finish time
  const estFinish = stats.estFinishTime
    ? new Date(stats.estFinishTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  // Format average pack time
  const avgTimeDisplay = stats.avgPackTimeSeconds
    ? `${stats.avgPackTimeSeconds} sec/box`
    : null;

  // Get next 5 shipments for display
  const next5 = queue.slice(0, 5);

  return (
    <div
      className="min-h-screen bg-background text-foreground p-8 flex flex-col"
      onClick={!audioEnabled ? handleEnableAudio : undefined}
    >
      {/* Audio enable prompt */}
      {!audioEnabled && (
        <div className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium animate-pulse">
          Click anywhere to enable sounds
        </div>
      )}

      {/* Progress Section */}
      <div className="flex-shrink-0 mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <ProgressBar current={progress} total={total} size="lg" />
          </div>

          <div className="flex justify-center gap-12 text-xl text-foreground-secondary">
            {estFinish && (
              <div className="flex items-center gap-2">
                <span>🕐</span>
                <span>Est. Finish: {estFinish}</span>
              </div>
            )}
            {avgTimeDisplay && (
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span>Avg: {avgTimeDisplay}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queue Section */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto">
          {next5.length > 0 ? (
            <OnDeckQueue shipments={next5} />
          ) : (
            <div className="text-center text-3xl text-green-400 py-16">
              🎉 All Done!
            </div>
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex-shrink-0 text-center text-foreground-tertiary mt-8">
        {stats.total} remaining • {stats.packedToday} packed today
      </div>
    </div>
  );
}
