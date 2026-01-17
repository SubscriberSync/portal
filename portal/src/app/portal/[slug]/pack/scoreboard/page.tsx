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
  const prevUnfulfilledRef = useRef<number | null>(null);

  // Handle sound effects based on state changes
  useEffect(() => {
    if (!data || !audioEnabled) return;

    const currentPacked = data.stats.packedToday;
    const currentUnfulfilled = data.stats.unfulfilled;
    const prevPacked = prevPackedRef.current;
    const prevUnfulfilled = prevUnfulfilledRef.current;

    // Check for milestone sounds
    if (prevPacked !== null && currentPacked > prevPacked) {
      // Level up every 10 boxes
      if (currentPacked % 10 === 0) {
        play('levelUp');
      }
      // Fanfare when batch is complete
      if (currentUnfulfilled === 0) {
        play('fanfare');
      }
    }

    // Alert when items get flagged (unfulfilled suddenly decreases without packed increasing)
    if (
      prevUnfulfilled !== null &&
      prevPacked !== null &&
      currentUnfulfilled < prevUnfulfilled &&
      currentPacked === prevPacked
    ) {
      play('alert');
    }

    prevPackedRef.current = currentPacked;
    prevUnfulfilledRef.current = currentUnfulfilled;
  }, [data, audioEnabled, play]);

  const handleEnableAudio = () => {
    enableAudio();
    setAudioEnabled(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-2xl text-white">Loading...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-2xl text-red-400">Failed to load queue</div>
      </div>
    );
  }

  const { queue, stats } = data;
  const progress = stats.packedToday;
  const total = stats.total;

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
      className="min-h-screen bg-gray-900 text-white p-8 flex flex-col"
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

          <div className="flex justify-center gap-12 text-xl text-gray-300">
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
      <div className="flex-shrink-0 text-center text-gray-500 mt-8">
        {stats.unfulfilled} remaining • {stats.packedToday} packed today
      </div>
    </div>
  );
}
