import { useEffect } from 'react';
import Svg, { Circle, G, Path, Mask } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Animated microphone illustration for the "checking" calibration state.
 *
 * - Green arc spinner rotates continuously around the top-right indicator
 * - Face (eyes + mouth) wiggles left-right in a loop
 */
export function MicChecking({ size = 118 }: { size?: number }) {
  const spinnerRotation = useSharedValue(0);
  const faceX = useSharedValue(0);

  useEffect(() => {
    // Continuous spinner rotation
    spinnerRotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1, // infinite
      false,
    );

    // Face wiggle: 0 → 2 → -2 → 0, repeating
    faceX.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-2, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);

  // Spinner: rotate around center of the circle (93.5, 32.5)
  // Using animated style on a wrapper View won't work for SVG internals,
  // so we use the transform origin trick with animated props.
  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 93.5 },
      { translateY: 32.5 },
      { rotate: `${spinnerRotation.value}deg` },
      { translateX: -93.5 },
      { translateY: -32.5 },
    ],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: faceX.value }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      {/* Mic stem */}
      <Path d="M47.79 84.96H53.69V100.3H47.79V84.96Z" fill="#A5A1F5" />

      {/* Mic arc */}
      <Path
        d="M24.19 57.82V62.54C24.19 69.5815 26.9872 76.3346 31.9663 81.3137C36.9454 86.2928 43.6985 89.09 50.74 89.09C57.7815 89.09 64.5346 86.2928 69.5137 81.3137C74.4928 76.3346 77.29 69.5815 77.29 62.54V57.82C77.29 57.0376 76.9792 56.2873 76.4259 55.734C75.8727 55.1808 75.1224 54.87 74.34 54.87C73.5576 54.87 72.8072 55.1808 72.254 55.734C71.7008 56.2873 71.39 57.0376 71.39 57.82V62.54C71.39 68.0167 69.2144 73.2691 65.3417 77.1418C61.4691 81.0144 56.2167 83.19 50.74 83.19C45.2633 83.19 40.0109 81.0144 36.1382 77.1418C32.2656 73.2691 30.09 68.0167 30.09 62.54V57.82C30.09 57.0376 29.7792 56.2873 29.226 55.734C28.6727 55.1808 27.9224 54.87 27.14 54.87C26.3576 54.87 25.6073 55.1808 25.054 55.734C24.5008 56.2873 24.19 57.0376 24.19 57.82Z"
        fill="#A5A1F5"
      />

      {/* Mic arc shadow mask */}
      <Mask id="mask0" maskUnits="userSpaceOnUse" x={24} y={54} width={54} height={36}>
        <Path
          d="M24.19 57.82V62.54C24.19 69.5815 26.9872 76.3346 31.9663 81.3137C36.9454 86.2928 43.6985 89.09 50.74 89.09C57.7815 89.09 64.5346 86.2928 69.5137 81.3137C74.4928 76.3346 77.29 69.5815 77.29 62.54V57.82C77.29 57.0376 76.9792 56.2873 76.4259 55.734C75.8727 55.1808 75.1224 54.87 74.34 54.87C73.5576 54.87 72.8072 55.1808 72.254 55.734C71.7008 56.2873 71.39 57.0376 71.39 57.82V62.54C71.39 68.0167 69.2144 73.2691 65.3417 77.1418C61.4691 81.0144 56.2167 83.19 50.74 83.19C45.2633 83.19 40.0109 81.0144 36.1382 77.1418C32.2656 73.2691 30.09 68.0167 30.09 62.54V57.82C30.09 57.0376 29.7792 56.2873 29.226 55.734C28.6727 55.1808 27.9224 54.87 27.14 54.87C26.3576 54.87 25.6073 55.1808 25.054 55.734C24.5008 56.2873 24.19 57.0376 24.19 57.82Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask0)">
        <Path d="M50 59.5C51.5 77.5 50.5 89 50.5 106.92H63.8955H78.9405L78.9405 53L50 59.5Z" fill="#8B87E8" />
      </G>

      {/* Stem shadow mask */}
      <Mask id="mask1" maskUnits="userSpaceOnUse" x={47} y={84} width={7} height={17}>
        <Path d="M47.79 84.96H53.69V100.3H47.79V84.96Z" fill="white" />
      </Mask>
      <G mask="url(#mask1)">
        <Path d="M50 63.5C51 82 51 89.5 50.5 107.38H80L78.5 51.5L50 63.5Z" fill="#8B87E8" />
      </G>

      {/* Base bar */}
      <Path
        d="M34.22 97.94H67.26C68.0424 97.94 68.7927 98.2508 69.346 98.804C69.8992 99.3573 70.21 100.108 70.21 100.89C70.21 101.672 69.8992 102.423 69.346 102.976C68.7927 103.529 68.0424 103.84 67.26 103.84H34.22C33.4376 103.84 32.6873 103.529 32.134 102.976C31.5808 102.423 31.27 101.672 31.27 100.89C31.27 100.108 31.5808 99.3573 32.134 98.804C32.6873 98.2508 33.4376 97.94 34.22 97.94Z"
        fill="#A5A1F5"
      />

      {/* Base bar shadow mask */}
      <Mask id="mask2" maskUnits="userSpaceOnUse" x={31} y={97} width={40} height={7}>
        <Path
          d="M34.22 97.94H67.26C68.0424 97.94 68.7927 98.2508 69.346 98.804C69.8992 99.3573 70.21 100.108 70.21 100.89C70.21 101.672 69.8992 102.423 69.346 102.976C68.7927 103.529 68.0424 103.84 67.26 103.84H34.22C33.4376 103.84 32.6873 103.529 32.134 102.976C31.5808 102.423 31.27 101.672 31.27 100.89C31.27 100.108 31.5808 99.3573 32.134 98.804C32.6873 98.2508 33.4376 97.94 34.22 97.94Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask2)">
        <Path d="M51 56C48.6399 73.7 51 89.5 50.9999 107.38H75.9999V55.46L51 56Z" fill="#8B87E8" />
      </G>

      {/* Mic body */}
      <Path
        d="M66.08 35.4C66.08 26.9279 59.212 20.06 50.74 20.06C42.2679 20.06 35.4 26.9279 35.4 35.4V57.82C35.4 66.292 42.2679 73.16 50.74 73.16C59.212 73.16 66.08 66.292 66.08 57.82V35.4Z"
        fill="#A5A1F5"
      />

      {/* Mic body shadow mask */}
      <Mask id="mask3" maskUnits="userSpaceOnUse" x={35} y={20} width={32} height={54}>
        <Path
          d="M35.4 35.4C35.4 31.3316 37.0162 27.4298 39.893 24.553C42.7698 21.6762 46.6716 20.06 50.74 20.06C54.8084 20.06 58.7102 21.6762 61.587 24.553C64.4638 27.4298 66.08 31.3316 66.08 35.4V57.82C66.08 61.8884 64.4638 65.7902 61.587 68.667C58.7102 71.5438 54.8084 73.16 50.74 73.16C46.6716 73.16 42.7698 71.5438 39.893 68.667C37.0162 65.7902 35.4 61.8884 35.4 57.82V35.4Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask3)">
        <Path d="M56.64 15.34C61.95 31.86 61.95 57.82 53.69 77.88H69.62V15.34H56.64Z" fill="#8B87E8" />
      </G>

      {/* Face — animated wiggle */}
      <AnimatedG style={faceStyle}>
        {/* Left eye */}
        <Circle cx={46.61} cy={42.48} r={2.36} fill="#16144F" />
        {/* Right eye */}
        <Circle cx={57.23} cy={42.48} r={2.36} fill="#16144F" />
        {/* Mouth */}
        <Path
          d="M47.79 53.1H53.69"
          stroke="#16144F"
          strokeWidth={2.655}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>

      {/* Static circle track */}
      <Circle cx={93.5} cy={32.5} r={10.6} stroke="#E1DFFF" strokeWidth={3.8} fill="none" />

      {/* Spinner arc — animated rotation */}
      <AnimatedG style={spinnerStyle}>
        <Path
          d="M104.24 32.62C104.24 30.5196 103.617 28.4663 102.45 26.7199C101.283 24.9734 99.6247 23.6122 97.6841 22.8084C95.7436 22.0046 93.6082 21.7943 91.5481 22.2041C89.4881 22.6139 87.5958 23.6253 86.1105 25.1106C84.6253 26.5958 83.6138 28.4881 83.2041 30.5482C82.7943 32.6083 83.0046 34.7436 83.8084 36.6841C84.6122 38.6247 85.9734 40.2833 87.7198 41.4502C89.4663 42.6172 91.5196 43.24 93.62 43.24"
          stroke="#E8FF7A"
          strokeWidth={4.13}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>
    </Svg>
  );
}
