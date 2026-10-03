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
import { useWindowDimensions } from 'react-native';
import {
  Canvas,
  Path as SkiaPath,
  Skia,
  BlurMask,
  Group,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { micRms } from '@/shared/lib/micRmsBus';

const HEIGHT = 100;
const SMOOTHING = 0.15;

interface WaveLayer {
  amp: number;
  freq: number;
  phaseOffset: number;
  /** opacity applied to accentColor */
  opacity: number;
  width: number;
  blur: number;
}

const DEFAULT_ACCENT = '#50C8FF';

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

/**
 * All layers derive color from accentColor at varying opacities.
 * Outer layers are bolder, inner layers more subtle, sharp lines are crisp.
 */
const WAVE_LAYERS: WaveLayer[] = [
  // outer bold wave (blurred)
  { amp: 1.0, freq: 1.0, phaseOffset: 0, opacity: 0.9, width: 2.5, blur: 6 },
  // mid layers (blurred)
  { amp: 0.85, freq: 1.15, phaseOffset: 0.4, opacity: 0.5, width: 1.5, blur: 4 },
  { amp: 0.75, freq: 1.3, phaseOffset: 0.8, opacity: 0.4, width: 1.2, blur: 3 },
  { amp: 0.65, freq: 1.5, phaseOffset: 1.2, opacity: 0.35, width: 1.0, blur: 2 },
  { amp: 0.55, freq: 1.7, phaseOffset: 1.6, opacity: 0.3, width: 1.0, blur: 2 },
  { amp: 0.45, freq: 1.9, phaseOffset: 2.0, opacity: 0.35, width: 1.0, blur: 1 },
  // bright core (blurred)
  { amp: 0.35, freq: 2.1, phaseOffset: 2.4, opacity: 0.5, width: 1.2, blur: 3 },
  { amp: 0.25, freq: 2.3, phaseOffset: 2.8, opacity: 0.4, width: 1.0, blur: 4 },
  { amp: 0.20, freq: 2.5, phaseOffset: 3.2, opacity: 0.6, width: 1.5, blur: 5 },
  // sharp accent lines — no blur, thin
  { amp: 0.92, freq: 1.05, phaseOffset: 0.2, opacity: 0.8, width: 0.8, blur: 0 },
  { amp: 0.70, freq: 1.4, phaseOffset: 1.0, opacity: 0.7, width: 0.6, blur: 0 },
  { amp: 0.50, freq: 1.8, phaseOffset: 1.8, opacity: 0.75, width: 0.7, blur: 0 },
];

const SEGMENTS = 128;

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
  const layerColors = WAVE_LAYERS.map(l => colorWithOpacity(resolvedAccent, l.opacity));

  return (
    <Canvas style={{ width, height }}>
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

function WavePath({
  layer,
  phase,
  smoothedRms,
  width,
  height,
  color,
}: {
  layer: WaveLayer;
  phase: { value: number };
  smoothedRms: { value: number };
  width: number;
  height: number;
  color: string;
}) {

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const midY = height / 2;
    const maxAmp = (height / 2) * 0.85;
    const amplitude = smoothedRms.value * maxAmp * layer.amp;
    const freq = layer.freq;
    const ph = phase.value + layer.phaseOffset;
    const step = width / SEGMENTS;

    p.moveTo(0, midY);

    for (let i = 1; i <= SEGMENTS; i++) {
      const x = i * step;
      const t = x / width;
      const envelope = Math.sin(t * Math.PI);
      const wave1 = Math.sin(t * Math.PI * 2 * freq + ph);
      const wave2 = 0.3 * Math.sin(t * Math.PI * 3 * freq + ph * 1.3);
      const y = midY + (wave1 + wave2) * amplitude * envelope;
      p.lineTo(x, y);
    }

    return p;
  });

  return (
    <Group>
      <SkiaPath
        path={path}
        color={color}
        style="stroke"
        strokeWidth={layer.width}
        strokeCap="round"
        strokeJoin="round"
      >
        {layer.blur > 0 && <BlurMask blur={layer.blur} style="normal" />}
      </SkiaPath>
    </Group>
  );
}
