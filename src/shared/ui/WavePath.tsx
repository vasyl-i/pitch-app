import { BlurMask, Group, Path as SkiaPath, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

export interface WaveLayer {
  amp: number;
  freq: number;
  phaseOffset: number;
  /** opacity applied to accentColor */
  opacity: number;
  width: number;
  blur: number;
}

/** every current caller passes its own colour; this is only the fallback */

/**
 * All layers derive color from accentColor at varying opacities.
 * Outer layers are bolder, inner layers more subtle, sharp lines are crisp.
 */
export const WAVE_LAYERS: WaveLayer[] = [
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
/** below this share of the available room the wave is drawn exactly as computed */
const KNEE = 0.7;

/**
 * Room (px) a layer needs between its centre line and the canvas edge for its
 * stroke and blur to stay inside: half the stroke plus ~3σ of the blur
 * (Skia turns a blur radius r into σ ≈ 0.577·r + 0.5).
 */
function edgeMargin(layer: WaveLayer) {
  const blurExtent = layer.blur > 0 ? 3 * (0.57735 * layer.blur + 0.5) : 0;
  return layer.width / 2 + blurExtent;
}

/**
 * Soft limit: untouched up to KNEE·limit, then eased so it approaches `limit`
 * but never reaches it. Loud input flattens against the edge instead of being
 * cut off by it, and quiet/normal levels look exactly as before.
 */
function softLimit(offset: number, limit: number) {
  'worklet';
  const knee = limit * KNEE;
  const abs = Math.abs(offset);
  if (abs <= knee) return offset;
  const room = limit - knee;
  const eased = knee + room * Math.tanh((abs - knee) / room);
  return offset < 0 ? -eased : eased;
}

/** one sine layer of the waveform, rebuilt on the UI thread each frame from the phase and smoothed level */
export function WavePath({
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
  // how far this layer may travel from the centre line and still be fully visible
  const limit = Math.max(height / 2 - edgeMargin(layer), 1);

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
      const y = midY + softLimit((wave1 + wave2) * amplitude * envelope, limit);
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
