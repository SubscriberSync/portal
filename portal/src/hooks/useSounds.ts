'use client';

import { useCallback, useRef } from 'react';

export type SoundType = 'click' | 'levelUp' | 'fanfare' | 'alert';

/**
 * Generates synthesized sounds using Web Audio API
 * No external files needed - sounds are generated programmatically
 */
export function useSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isEnabledRef = useRef(false);

  // Get or create audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Enable audio (required for iOS/browsers that block autoplay)
  const enableAudio = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    isEnabledRef.current = true;
  }, [getAudioContext]);

  // Play a short click sound
  const playClick = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = 800;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }, [getAudioContext]);

  // Play level up sound (ascending arpeggio)
  const playLevelUp = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      const startTime = ctx.currentTime + (i * 0.1);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }, [getAudioContext]);

  // Play fanfare sound (triumphant chord progression)
  const playFanfare = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // First chord - C major
    const chord1 = [261.63, 329.63, 392.00]; // C4, E4, G4
    // Second chord - G major  
    const chord2 = [392.00, 493.88, 587.33]; // G4, B4, D5
    // Final chord - C major (higher)
    const chord3 = [523.25, 659.25, 783.99]; // C5, E5, G5

    const playChord = (notes: number[], startTime: number, duration: number) => {
      notes.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = freq;
        osc.type = 'triangle';
        
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.setValueAtTime(0.15, startTime + duration - 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    };

    playChord(chord1, ctx.currentTime, 0.3);
    playChord(chord2, ctx.currentTime + 0.3, 0.3);
    playChord(chord3, ctx.currentTime + 0.6, 0.5);
  }, [getAudioContext]);

  // Play alert sound (warning beep)
  const playAlert = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = 440; // A4
      osc.type = 'square';
      
      const startTime = ctx.currentTime + (i * 0.2);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
      
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  }, [getAudioContext]);

  // Main play function
  const play = useCallback((sound: SoundType) => {
    if (!isEnabledRef.current) return;

    switch (sound) {
      case 'click':
        playClick();
        break;
      case 'levelUp':
        playLevelUp();
        break;
      case 'fanfare':
        playFanfare();
        break;
      case 'alert':
        playAlert();
        break;
    }
  }, [playClick, playLevelUp, playFanfare, playAlert]);

  return {
    play,
    enableAudio,
    isEnabled: isEnabledRef.current,
  };
}
