import { memo } from 'react';
import { Group, Line, Path, Rect, RoundedRect, Text as SkiaText, vec, type SkFont } from '@shopify/react-native-skia';
import { blackAlpha, palette, whiteAlpha } from '@/shared/theme';
import { LABEL_MARGIN, type PianoRollLayout } from './usePianoRollLayout';
import type { TargetRect } from './useTargetRects';
import type { BandPaths } from './useTrailPaths';

const WHITE_KEY_BG = whiteAlpha(0.04);
const BLACK_KEY_BG = blackAlpha(0.15);
const ROW_LINE = whiteAlpha(0.06);
const BEAT_LINE = whiteAlpha(0.08);
const BAR_LINE = whiteAlpha(0.18);
const LABEL = whiteAlpha(0.25);
const C_LABEL = whiteAlpha(0.45);
const NOTE = palette.accentSecondary;
const NOTE_ACTIVE = palette.white;

/**
 * Row stripes, note names and beat lines: fixed for a layout, so memoised —
 * the canvas re-renders with the trail and must not rebuild these hundred-odd
 * nodes each time.
 */
export const PianoRollGrid = memo(function PianoRollGrid({ rows, beatLines, W, H, semiH, font }: {
  rows: PianoRollLayout['rows'];
  beatLines: PianoRollLayout['beatLines'];
  W: number;
  H: number;
  semiH: number;
  font: SkFont | null;
}) {
  return (
    <>
      {rows.map((row, i) => (
        <Group key={`row${i}`}>
          <Rect x={LABEL_MARGIN} y={row.y} width={W - LABEL_MARGIN} height={row.height} color={row.isBlack ? BLACK_KEY_BG : WHITE_KEY_BG} />
          <Line p1={vec(LABEL_MARGIN, row.y + row.height)} p2={vec(W, row.y + row.height)} color={row.isC ? BAR_LINE : ROW_LINE} strokeWidth={row.isC ? 1 : 0.5} />
        </Group>
      ))}
      {/* note names on the left: white keys only, unless rows are tall enough */}
      {font &&
        rows.map((row, i) =>
          row.isBlack && semiH < 18 ? null : (
            <SkiaText key={`lbl${i}`} x={4} y={row.y + row.height / 2 + 4} text={row.label} font={font} color={row.isC ? C_LABEL : LABEL} />
          ),
        )}
      {beatLines.map((bl, i) => (
        <Line key={`bl${i}`} p1={vec(bl.x, 0)} p2={vec(bl.x, H)} color={bl.isBar ? BAR_LINE : BEAT_LINE} strokeWidth={bl.isBar ? 1 : 0.5} />
      ))}
    </>
  );
});

/** the target notes; re-rendered only when the active note moves */
export const TargetBlocks = memo(function TargetBlocks({ rects, font, showLabels }: { rects: TargetRect[]; font: SkFont | null; showLabels: boolean }) {
  return (
    <>
      {rects.map((r, i) => {
        const color = r.active ? NOTE_ACTIVE : NOTE;
        return (
          <Group key={i}>
            {r.active && <RoundedRect x={r.x - 3} y={r.y - 3} width={r.width + 6} height={r.height + 6} r={6} color={NOTE_ACTIVE} opacity={0.1} />}
            <RoundedRect x={r.x} y={r.y} width={r.width} height={r.height} r={4} color={color} opacity={r.active ? 0.35 : 0.2} />
            <RoundedRect x={r.x} y={r.y + r.height * 0.25} width={r.width} height={r.height * 0.5} r={3} color={color} opacity={r.active ? 0.55 : 0.3} />
            {showLabels && font && r.width > 20 && (
              <SkiaText x={r.x + 5} y={r.y + r.height / 2 + 4} text={r.label} font={font} color={r.active ? whiteAlpha(0.9) : whiteAlpha(0.5)} />
            )}
          </Group>
        );
      })}
    </>
  );
});

const BANDS: { key: keyof BandPaths; color: string; width: number }[] = [
  { key: 'gray', color: whiteAlpha(0.4), width: 2.5 },
  { key: 'yellow', color: palette.warning, width: 3 },
  { key: 'orange', color: palette.caution, width: 3 },
  { key: 'red', color: palette.danger, width: 3 },
  { key: 'lime', color: palette.accent, width: 3 },
];

/** the sung trail, a stroke per accuracy band (best drawn last, on top) */
export function TrailPaths({ paths }: { paths: BandPaths }) {
  return (
    <>
      {BANDS.map((b) => (
        <Path key={b.key} path={paths[b.key]} color={b.color} style="stroke" strokeWidth={b.width} strokeCap="round" strokeJoin="round" />
      ))}
    </>
  );
}
