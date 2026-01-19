# Pack Mode Sound Effects

Pack Mode sounds are now generated programmatically using the Web Audio API.
No external sound files are required.

## Sound Types

The following sounds are available via the `useSounds` hook:

- **click** - Short click sound for button taps (sine wave, quick decay)
- **levelUp** - Celebratory ascending arpeggio for every 10 boxes packed (C-E-G-C progression)
- **fanfare** - Triumphant chord progression for completing all boxes (C-G-C major chords)
- **alert** - Warning beep pattern for flagged items (3 square wave pulses)

## Usage

```typescript
import { useSounds } from '@/hooks/useSounds';

function MyComponent() {
  const { play, enableAudio } = useSounds();
  
  // Must enable audio first (required for iOS/browsers that block autoplay)
  // Usually done on first user interaction
  const handleFirstClick = () => {
    enableAudio();
  };
  
  // Then play sounds
  const handlePacked = () => {
    play('click');
  };
}
```

## Why Web Audio API?

1. No external dependencies or file downloads
2. Works offline
3. Instant playback (no network latency)
4. Consistent across all browsers
5. Easy to customize frequencies and durations
