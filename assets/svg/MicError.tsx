import { useEffect } from 'react';
import Svg, { Circle, Path, Mask, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

// Eye centers
const LEFT_EYE_CX = 44.84;
const LEFT_EYE_CY = 41.89;
const RIGHT_EYE_CX = 56.64;
const RIGHT_EYE_CY = 41.89;

const EASE = Easing.out(Easing.quad);

/**
 * Animated microphone illustration for the "error" calibration state.
 *
 * Cross (X) eyes spin 360° quickly with ease-out, then pause 1s before repeating.
 */
export function MicError({ size = 118 }: { size?: number }) {
  const leftRot = useSharedValue(0);
  const rightRot = useSharedValue(0);

  useEffect(() => {
    // Spin 360° fast, then pause 1s
    leftRot.value = withRepeat(
      withSequence(
        withTiming(360, { duration: 400, easing: EASE }),
        withDelay(1000, withTiming(360, { duration: 0 })),
      ),
      -1,
      false,
    );
    // Reset to 0 after each cycle so rotation restarts
    leftRot.value = withRepeat(
      withDelay(
        0,
        withSequence(
          withTiming(360, { duration: 400, easing: EASE }),
          withTiming(360, { duration: 1000 }), // hold
          withTiming(0, { duration: 0 }), // reset
        ),
      ),
      -1,
      false,
    );

    rightRot.value = withRepeat(
      withDelay(
        0,
        withSequence(
          withTiming(360, { duration: 400, easing: EASE }),
          withTiming(360, { duration: 1000 }), // hold
          withTiming(0, { duration: 0 }), // reset
        ),
      ),
      -1,
      false,
    );
  }, []);

  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: LEFT_EYE_CX },
      { translateY: LEFT_EYE_CY },
      { rotate: `${leftRot.value}deg` },
      { translateX: -LEFT_EYE_CX },
      { translateY: -LEFT_EYE_CY },
    ],
  }));

  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: RIGHT_EYE_CX },
      { translateY: RIGHT_EYE_CY },
      { rotate: `${rightRot.value}deg` },
      { translateX: -RIGHT_EYE_CX },
      { translateY: -RIGHT_EYE_CY },
    ],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      {/* Mic arc */}
      <Path
        d="M24.1901 57.82V62.54C24.1901 69.5815 26.9873 76.3346 31.9664 81.3137C36.9455 86.2928 43.6986 89.09 50.7401 89.09C57.7816 89.09 64.5347 86.2928 69.5137 81.3137C74.4928 76.3346 77.2901 69.5815 77.2901 62.54V57.82C77.2901 57.0376 76.9793 56.2873 76.426 55.734C75.8728 55.1808 75.1224 54.87 74.3401 54.87C73.5577 54.87 72.8073 55.1808 72.2541 55.734C71.7009 56.2873 71.3901 57.0376 71.3901 57.82V62.54C71.3901 68.0167 69.2144 73.2691 65.3418 77.1418C61.4692 81.0144 56.2168 83.19 50.7401 83.19C45.2633 83.19 40.0109 81.0144 36.1383 77.1418C32.2657 73.2691 30.0901 68.0167 30.0901 62.54V57.82C30.0901 57.0376 29.7793 56.2873 29.226 55.734C28.6728 55.1808 27.9225 54.87 27.1401 54.87C26.3577 54.87 25.6073 55.1808 25.0541 55.734C24.5009 56.2873 24.1901 57.0376 24.1901 57.82Z"
        fill="#A5A1F5"
      />
      <Mask id="mask0" maskUnits="userSpaceOnUse" x={24} y={54} width={54} height={36}>
        <Path
          d="M24.1901 57.82V62.54C24.1901 69.5815 26.9873 76.3346 31.9664 81.3137C36.9455 86.2928 43.6986 89.09 50.7401 89.09C57.7816 89.09 64.5347 86.2928 69.5137 81.3137C74.4928 76.3346 77.2901 69.5815 77.2901 62.54V57.82C77.2901 57.0376 76.9793 56.2873 76.426 55.734C75.8728 55.1808 75.1224 54.87 74.3401 54.87C73.5577 54.87 72.8073 55.1808 72.2541 55.734C71.7009 56.2873 71.3901 57.0376 71.3901 57.82V62.54C71.3901 68.0167 69.2144 73.2691 65.3418 77.1418C61.4692 81.0144 56.2168 83.19 50.7401 83.19C45.2633 83.19 40.0109 81.0144 36.1383 77.1418C32.2657 73.2691 30.0901 68.0167 30.0901 62.54V57.82C30.0901 57.0376 29.7793 56.2873 29.226 55.734C28.6728 55.1808 27.9225 54.87 27.1401 54.87C26.3577 54.87 25.6073 55.1808 25.0541 55.734C24.5009 56.2873 24.1901 57.0376 24.1901 57.82Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask0)">
        <Path d="M50.5 56C50.5 75.0293 50.5 89.0924 50.5 107H81V55L50.5 56Z" fill="#8B87E8" />
      </G>

      {/* Stem */}
      <Path d="M47.79 84.96H53.69V100.3H47.79V84.96Z" fill="#A5A1F5" />
      <Mask id="mask1" maskUnits="userSpaceOnUse" x={47} y={84} width={7} height={17}>
        <Path d="M47.79 84.96H53.69V100.3H47.79V84.96Z" fill="white" />
      </Mask>
      <G mask="url(#mask1)">
        <Path d="M51.5 57C50 75 50.5 89.5 50.5 107.38H81.42V55.46L51.5 57Z" fill="#8B87E8" />
      </G>

      {/* Base bar */}
      <Path
        d="M34.22 97.94H67.26C68.0424 97.94 68.7928 98.2508 69.346 98.804C69.8992 99.3573 70.21 100.108 70.21 100.89C70.21 101.672 69.8992 102.423 69.346 102.976C68.7928 103.529 68.0424 103.84 67.26 103.84H34.22C33.4377 103.84 32.6873 103.529 32.1341 102.976C31.5809 102.423 31.2701 101.672 31.2701 100.89C31.2701 100.108 31.5809 99.3573 32.1341 98.804C32.6873 98.2508 33.4377 97.94 34.22 97.94Z"
        fill="#A5A1F5"
      />
      <Mask id="mask2" maskUnits="userSpaceOnUse" x={31} y={97} width={40} height={7}>
        <Path
          d="M34.22 97.94H67.26C68.0424 97.94 68.7928 98.2508 69.346 98.804C69.8992 99.3573 70.21 100.108 70.21 100.89C70.21 101.672 69.8992 102.423 69.346 102.976C68.7928 103.529 68.0424 103.84 67.26 103.84H34.22C33.4377 103.84 32.6873 103.529 32.1341 102.976C31.5809 102.423 31.2701 101.672 31.2701 100.89C31.2701 100.108 31.5809 99.3573 32.1341 98.804C32.6873 98.2508 33.4377 97.94 34.22 97.94Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask2)">
        <Path d="M51.3301 57.5C48.9701 75.2 50.5001 90 50.5001 107.38H81.42V55.46L51.3301 57.5Z" fill="#8B87E8" />
      </G>

      {/* Mic body */}
      <Path
        d="M66.0801 35.4C66.0801 26.9279 59.2121 20.06 50.7401 20.06C42.268 20.06 35.4001 26.9279 35.4001 35.4V57.82C35.4001 66.292 42.268 73.16 50.7401 73.16C59.2121 73.16 66.0801 66.292 66.0801 57.82V35.4Z"
        fill="#A5A1F5"
      />
      <Mask id="mask3" maskUnits="userSpaceOnUse" x={35} y={20} width={32} height={54}>
        <Path
          d="M35.4001 35.4C35.4001 31.3316 37.0162 27.4298 39.893 24.553C42.7698 21.6762 46.6716 20.06 50.7401 20.06C54.8085 20.06 58.7103 21.6762 61.5871 24.553C64.4639 27.4298 66.0801 31.3316 66.0801 35.4V57.82C66.0801 61.8884 64.4639 65.7902 61.5871 68.667C58.7103 71.5438 54.8085 73.16 50.7401 73.16C46.6716 73.16 42.7698 71.5438 39.893 68.667C37.0162 65.7902 35.4001 61.8884 35.4001 57.82V35.4Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask3)">
        <Path d="M56.64 15.34C61.95 31.86 61.95 57.82 53.69 77.88H69.62V15.34H56.64Z" fill="#8B87E8" />
      </G>

      {/* Left eye (X) — animated spin */}
      <AnimatedG style={leftEyeStyle}>
        <Path
          d="M42.48 39.53L47.2 44.25M47.2 39.53L42.48 44.25"
          stroke="#16144F"
          strokeWidth={2.655}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>

      {/* Right eye (X) — animated spin */}
      <AnimatedG style={rightEyeStyle}>
        <Path
          d="M54.2801 39.53L59.0001 44.25M59.0001 39.53L54.2801 44.25"
          stroke="#16144F"
          strokeWidth={2.655}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>

      {/* Mouth (sad curve) */}
      <Path
        d="M47.2001 54.87C49.5601 52.51 51.9201 52.51 54.2801 54.87"
        stroke="#16144F"
        strokeWidth={2.655}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Warning triangle */}
      <Path
        d="M96.1909 19.5777C97.397 17.4741 98.603 17.4741 99.8091 19.5777L112.411 41.8445C113.617 43.9482 112.972 45 110.477 45H85.5234C83.028 45 82.3834 43.9482 83.5895 41.8445L96.1909 19.5777Z"
        fill="#EEFF88"
      />
      {/* Triangle — exclamation line */}
      <Path
        d="M97.9401 25.96V34.22"
        stroke="#16144F"
        strokeWidth={3.54}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Triangle — exclamation dot */}
      <Circle cx={97.94} cy={40.12} r={2.124} fill="#16144F" />
    </Svg>
  );
}
