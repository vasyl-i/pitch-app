import { Circle, Group, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { useDerivedValue, type DerivedValue, type SharedValue } from 'react-native-reanimated';
import { palette } from '@/shared/theme';

/** the live pitch as shared values, read on the UI thread — no re-render per pitch */
export interface LivePitchValues {
  /** raw sung pitch; NaN while silent */
  midi: SharedValue<number>;
  /** the deviation's colour band */
  color: SharedValue<string>;
  /** the steadied note's name */
  noteText: SharedValue<string>;
}

/**
 * The glowing dot at the live pitch and its note name, entirely on the UI
 * thread: height and colour follow the live values, and it rides the
 * playhead's transform across — so a pitch update costs no React render
 * and the dot glides at 60 fps. Hidden while silent.
 */
export function LiveDot({ live, transform, H, midCenter, semiH }: {
  live: LivePitchValues;
  /** the playhead's translateX */
  transform: DerivedValue<{ translateX: number }[]>;
  H: number;
  /** the pitch at the canvas's vertical centre; a shared value when the view follows the voice */
  midCenter: number | SharedValue<number>;
  semiH: number;
}) {
  const y = useDerivedValue(() => {
    const m = live.midi.value;
    const centre = typeof midCenter === 'number' ? midCenter : midCenter.value;
    return Number.isNaN(m) ? -1000 : H / 2 - (m - centre) * semiH;
  }, [H, midCenter, semiH]);
  const opacity = useDerivedValue(() => (Number.isNaN(live.midi.value) ? 0 : 1));
  const labelY = useDerivedValue(() => y.value + 5);
  const font = useFont(require('../../../../../assets/fonts/Satoshi-Medium.ttf'), 16);

  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={y} r={26} color={live.color} opacity={0.05} />
      <Circle cx={0} cy={y} r={20} color={live.color} opacity={0.08} />
      <Circle cx={0} cy={y} r={15} color={live.color} opacity={0.15} />
      <Circle cx={0} cy={y} r={10} color={live.color} opacity={0.85} />
      <Circle cx={0} cy={y} r={7.5} color={live.color} opacity={0.5} />
      <Circle cx={0} cy={y} r={7.5} color={palette.white} opacity={0.5} />
      <Circle cx={0} cy={y} r={5} color={palette.white} opacity={0.95} />
      {font && <SkiaText x={16} y={labelY} text={live.noteText} font={font} color={palette.accent} />}
    </Group>
  );
}
