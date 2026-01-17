'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSounds } from '@/hooks/useSounds';

export default function CompletePage() {
  const params = useParams();
  const clientSlug = params.slug as string;
  const { play, enableAudio } = useSounds();

  useEffect(() => {
    // Enable audio and play fanfare on mount
    enableAudio();
    const timer = setTimeout(() => {
      play('fanfare');
    }, 500);

    return () => clearTimeout(timer);
  }, [enableAudio, play]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 flex flex-col items-center justify-center p-8">
      <div className="text-center">
        {/* Celebration icon */}
        <div className="text-9xl mb-8 animate-bounce">🎉</div>

        {/* Main message */}
        <h1 className="text-5xl font-bold text-white mb-4">ALL DONE!</h1>

        <p className="text-2xl text-green-100 mb-12">
          Great job! All shipments have been packed.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/portal/${clientSlug}/pack`}
            className="px-8 py-4 bg-white text-green-600 font-bold text-xl rounded-xl hover:bg-green-50 transition-colors"
          >
            Back to Pack Prep
          </Link>
          <Link
            href={`/portal/${clientSlug}`}
            className="px-8 py-4 bg-green-700 text-white font-bold text-xl rounded-xl hover:bg-green-800 transition-colors"
          >
            Return to Portal
          </Link>
        </div>
      </div>

      {/* Confetti-like decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 rounded-full animate-pulse"
            style={{
              backgroundColor: ['#fff', '#fef08a', '#86efac', '#fca5a5'][i % 4],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}
