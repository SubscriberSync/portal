'use client';

import { useCallback, useRef, useEffect } from 'react';

export type SoundType = 'click' | 'levelUp' | 'fanfare' | 'alert';

const soundFiles: Record<SoundType, string> = {
  click: '/sounds/click.mp3',
  levelUp: '/sounds/levelup.mp3',
  fanfare: '/sounds/fanfare.mp3',
  alert: '/sounds/alert.mp3',
};

export function useSounds() {
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    click: null,
    levelUp: null,
    fanfare: null,
    alert: null,
  });
  const isEnabledRef = useRef(false);

  // Initialize audio elements on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    Object.entries(soundFiles).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioRefs.current[key as SoundType] = audio;
    });

    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  const enableAudio = useCallback(() => {
    isEnabledRef.current = true;
    // Play silent audio to unlock audio context on iOS
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = 0;
        audio.play().catch(() => {});
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }
    });
  }, []);

  const play = useCallback((sound: SoundType) => {
    if (!isEnabledRef.current) return;

    const audio = audioRefs.current[sound];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Silently fail if audio play is blocked
      });
    }
  }, []);

  return {
    play,
    enableAudio,
    isEnabled: isEnabledRef.current,
  };
}
