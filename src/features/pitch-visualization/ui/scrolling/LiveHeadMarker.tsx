import { Blur, Circle, Group, Paint, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { useCanvasFont } from '@/shared/ui/useCanvasFont';
import { midiToName } from '@/shared/lib/music';
import { palette } from '@/shared/theme';
import { t } from '@/shared/i18n';
import { useStabilizedNote } from '../../lib/useStabilizedNote';

const LABEL_GAP = 16;
const HZ_GAP = 6;

/** the glowing dot at the live pitch, with the steadied note name and (optionally) the frequency beside it */
export function LiveHeadMarker({ x, y, midi, color, frequency }: { x: number; y: number; midi: number; color: string; frequency?: number | null }) {
  const shownNote = useStabilizedNote(midi);
  const noteFont = useFont(require('../../../../../assets/fonts/Satoshi-Medium.ttf'), 16);
  // the unit is localised («Гц») and Satoshi has no Cyrillic — useCanvasFont falls back to Manrope
  const { fontFor } = useCanvasFont(require('../../../../../assets/fonts/Satoshi-Regular.ttf'), 12);
  const hzFont = fontFor(t('pitch.hzLower', { value: 0 }));
  const note = shownNote === null ? null : midiToName(shownNote, 'ascii');
  const labelY = y + 5;

  return (
    <>
      <Group layer={<Paint><Blur blur={10} /></Paint>}>
        <Circle cx={x} cy={y} r={16} color={color} opacity={0.4} />
      </Group>
      <Group layer={<Paint><Blur blur={5} /></Paint>}>
        <Circle cx={x} cy={y} r={11} color={color} opacity={0.5} />
      </Group>
      <Circle cx={x} cy={y} r={10} color={color} opacity={0.85} />
      <Circle cx={x} cy={y} r={7.5} color={color} opacity={0.5} />
      <Circle cx={x} cy={y} r={7.5} color={palette.white} opacity={0.5} />
      <Circle cx={x} cy={y} r={5} color={palette.white} opacity={0.95} />

      {note && noteFont && <SkiaText x={x + LABEL_GAP} y={labelY} text={note} font={noteFont} color={palette.accent} />}
      {note && noteFont && hzFont && !!frequency && (
        <SkiaText
          x={x + LABEL_GAP + noteFont.measureText(note).width + HZ_GAP}
          y={labelY}
          text={t('pitch.hzLower', { value: Math.round(frequency) })}
          font={hzFont}
          color={palette.textSecondaryElevated}
        />
      )}
    </>
  );
}
