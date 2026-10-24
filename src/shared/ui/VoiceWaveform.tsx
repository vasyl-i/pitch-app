/**
 * Siri-style voice waveform visualizer driven by mic RMS.
 *
 * Renders multiple flowing sine-wave paths on a Skia Canvas using
 * useFrameCallback — fully UI-threaded, zero React re-renders.
 * When active, amplitude is driven by micRms; when idle, a gentle
 * breathing animation plays.
 *
 * Accepts an optional `accentColor` prop — thin sharp accent lines
 * adopt that color (e.g. green for on-pitch, orange for off-pitch).
 * Defaults to blue when no color is provided.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { WAVE_LAYERS, WavePath } from './WavePath';
import { micRms } from '@/shared/lib/micRmsBus';
import { palette } from '@/shared/theme';

const HEIGHT = 100;
const SMOOTHING = 0.15;

const DEFAULT_ACCENT = palette.accentTertiary;

/** Parse a CSS color string to [r, g, b]. Handles hex (#RGB, #RRGGBB) and rgb()/rgba(). */
function parseColor(color: string): [number, number, number] {
  // hex
  const hex = color.replace('#', '');
  if (/^[0-9a-fA-F]{3,8}$/.test(hex)) {
    const h = hex.length <= 4
      ? hex.slice(0, 3).split('').map(c => parseInt(c + c, 16))
      : [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    return h as [number, number, number];
  }
  // rgb/rgba
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return [80, 200, 255]; // fallback blue
}

function colorWithOpacity(color: string, opacity: number): string {
  const [r, g, b] = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}


interface VoiceWaveformProps {
  active?: boolean;
  height?: number;
  /** color for the sharp accent lines — defaults to blue */
  accentColor?: string;
}

export function VoiceWaveform({ active = false, height = HEIGHT, accentColor }: VoiceWaveformProps) {
  const { width } = useWindowDimensions();
  const phase = useSharedValue(0);
  const smoothedRms = useSharedValue(0);

  useFrameCallback((info) => {
    'worklet';
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;

    phase.value += dt * 5.0;

    if (active) {
      const rms = micRms.value;
      const target = Math.min(rms * 35, 1);
      smoothedRms.value += (target - smoothedRms.value) * SMOOTHING;
    } else {
      const idle = 0.08 + 0.04 * Math.sin(phase.value * 0.6);
      smoothedRms.value += (idle - smoothedRms.value) * 0.06;
    }
  });

  const resolvedAccent = accentColor ?? DEFAULT_ACCENT;
  const layerColors = useMemo(() => WAVE_LAYERS.map((l) => colorWithOpacity(resolvedAccent, l.opacity)), [resolvedAccent]);
  const canvasSize = useMemo(() => ({ width, height }), [width, height]);

  return (
    <Canvas style={canvasSize}>
      {WAVE_LAYERS.map((layer, i) => (
        <WavePath
          key={i}
          layer={layer}
          phase={phase}
          smoothedRms={smoothedRms}
          width={width}
          height={height}
          color={layerColors[i]}
        />
      ))}
    </Canvas>
  );
}
