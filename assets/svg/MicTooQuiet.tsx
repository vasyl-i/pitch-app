import { useEffect } from 'react';
import Svg, { Path, Mask, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

const BIG_CX = 88.2;
const BIG_CY = 36.5;
const SMALL_CX = 99.1;
const SMALL_CY = 16.7;

/**
 * Animated microphone illustration for the "too-quiet" calibration state.
 *
 * Both Z shapes gently pulse in scale — the bottom one stays larger.
 */
export function MicTooQuiet({ size = 118 }: { size?: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true, // reverse
    );
  }, []);

  // Big Z: gentle scale 1.0 → 0.9
  const bigZStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: BIG_CX },
      { translateY: BIG_CY },
      { scale: 1 - pulse.value * 0.1 },
      { translateX: -BIG_CX },
      { translateY: -BIG_CY },
    ],
  }));

  // Small Z: gentle scale 1.0 → 0.85
  const smallZStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: SMALL_CX },
      { translateY: SMALL_CY },
      { scale: 1 - pulse.value * 0.15 },
      { translateX: -SMALL_CX },
      { translateY: -SMALL_CY },
    ],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      {/* Mic arc + stand */}
      <Path
        d="M28.0362 57.1232V61.8432C28.0362 68.1023 30.5226 74.1051 34.9485 78.5309C39.3743 82.9568 45.3771 85.4432 51.6362 85.4432C57.8953 85.4432 63.8981 82.9568 68.3239 78.5309C72.7498 74.1051 75.2362 68.1023 75.2362 61.8432V57.1232"
        stroke="#A5A1F5"
        strokeWidth={5.9}
        strokeLinecap="round"
      />
      <Path
        d="M51.6362 85.4432V98.4232M38.6562 99.6032H64.6162"
        stroke="#A5A1F5"
        strokeWidth={5.9}
        strokeLinecap="round"
      />

      {/* Arc + stand shadow mask */}
      <Mask id="mask0" maskUnits="userSpaceOnUse" x={25} y={54} width={54} height={49}>
        <Path
          d="M28.0362 57.1232V61.8432C28.0362 68.1023 30.5226 74.1051 34.9485 78.5309C39.3743 82.9568 45.3771 85.4432 51.6362 85.4432C57.8953 85.4432 63.8981 82.9568 68.3239 78.5309C72.7498 74.1051 75.2362 68.1023 75.2362 61.8432V57.1232"
          stroke="white"
          strokeWidth={5.9}
          strokeLinecap="round"
        />
        <Path
          d="M51.6362 85.4432V98.4232M38.6562 99.6032H64.6162"
          stroke="white"
          strokeWidth={5.9}
          strokeLinecap="round"
        />
      </Mask>
      <G mask="url(#mask0)">
        <Path d="M53.3511 54.7316C50.87 72.4487 52.5758 88.9847 50.715 106.702H82.349V54.7316H53.3511Z" fill="#8B87E8" />
      </G>

      {/* Mic body */}
      <Path
        d="M66.9762 34.7033C66.9762 26.2312 60.1082 19.3633 51.6362 19.3633C43.1641 19.3633 36.2962 26.2312 36.2962 34.7033V57.1233C36.2962 65.5953 43.1641 72.4633 51.6362 72.4633C60.1082 72.4633 66.9762 65.5953 66.9762 57.1233V34.7033Z"
        fill="#A5A1F5"
      />

      {/* Mic body shadow mask */}
      <Mask id="mask1" maskUnits="userSpaceOnUse" x={36} y={19} width={31} height={54}>
        <Path
          d="M66.9762 34.7033C66.9762 26.2312 60.1082 19.3633 51.6362 19.3633C43.1641 19.3633 36.2962 26.2312 36.2962 34.7033V57.1233C36.2962 65.5953 43.1641 72.4633 51.6362 72.4633C60.1082 72.4633 66.9762 65.5953 66.9762 57.1233V34.7033Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask1)">
        <Path d="M57.5362 14.6431C62.8462 31.1631 62.8462 57.1231 54.5862 77.1831H70.5162V14.6431H57.5362Z" fill="#8B87E8" />
      </G>

      {/* Face — squinting eyes + mouth */}
      <Path
        d="M44.5562 41.7832C46.5229 43.7499 48.4895 43.7499 50.4562 41.7832M52.8162 41.7832C54.7829 43.7499 56.7495 43.7499 58.7162 41.7832"
        stroke="#16144F"
        strokeWidth={2.655}
        strokeLinecap="round"
      />
      <Path
        d="M48.6862 52.4033H54.5862"
        stroke="#16144F"
        strokeWidth={2.655}
        strokeLinecap="round"
      />

      {/* Big Z — animated */}
      <AnimatedG style={bigZStyle}>
        <Path
          d="M82.3162 29.9834H94.1162L82.3162 42.9634H94.1162"
          stroke="#EEFF88"
          strokeWidth={4.72}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>

      {/* Small Z — animated */}
      <AnimatedG style={smallZStyle}>
        <Path
          d="M95.2962 12.2836H102.966L95.2962 21.1336H102.966"
          stroke="#EEFF88"
          strokeWidth={3.54}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>
    </Svg>
  );
}
