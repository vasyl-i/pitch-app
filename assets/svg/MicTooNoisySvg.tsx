import { useEffect } from 'react';
import Svg, { Path, Mask, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Zigzag with high-frequency x-displacement — like a sound wave with sharp peaks.
 */
function waveZigzagLeft(shift: number): string {
  'worklet';
  const pts = [
    [17.7, 36.58], [12.39, 43.66], [20.65, 49.56], [14.75, 56.64], [20.65, 62.54],
  ];
  const amp = 2;
  return pts
    .map(([x, y], i) => {
      const ox = x + Math.sin(shift + i * Math.PI) * amp;
      return `${i === 0 ? 'M' : 'L'} ${ox.toFixed(2)} ${y}`;
    })
    .join(' ');
}

function waveZigzagRight(shift: number): string {
  'worklet';
  const pts = [
    [100.3, 36.58], [105.61, 43.66], [97.35, 49.56], [103.25, 56.64], [97.35, 62.54],
  ];
  const amp = 2;
  return pts
    .map(([x, y], i) => {
      const ox = x + Math.sin(shift + i * Math.PI + Math.PI) * amp;
      return `${i === 0 ? 'M' : 'L'} ${ox.toFixed(2)} ${y}`;
    })
    .join(' ');
}

/**
 * Animated microphone illustration for the "too-noisy" calibration state.
 *
 * - Side zigzags shake vertically
 * - Mouth waves smoothly
 */
export function MicTooNoisySvg({ size = 118 }: { size?: number }) {
  const zigShake = useSharedValue(0);
  const zigWave = useSharedValue(0);
  const faceShake = useSharedValue(0);

  useEffect(() => {
    // Fast zigzag vertical shaking
    zigShake.value = withRepeat(
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );

    // ~6 shape changes per second: full cycle in ~167ms
    zigWave.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 167, easing: Easing.linear }),
      -1,
      false,
    );

    // Face shaking left-right ~3 times/sec: full cycle in ~333ms
    faceShake.value = withRepeat(
      withTiming(1, { duration: 167, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  // Left: down → up, Right: up → down (opposite directions)
  const leftZigStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (zigShake.value * 2 - 1) * 4 }],
  }));

  const rightZigStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (zigShake.value * 2 - 1) * -4 }],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: faceShake.value * 3 - 1.5 }],
  }));

  const leftZigProps = useAnimatedProps(() => ({
    d: waveZigzagLeft(zigWave.value),
  }));

  const rightZigProps = useAnimatedProps(() => ({
    d: waveZigzagRight(zigWave.value),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      {/* Mic arc */}
      <Path
        d="M32.45 57.8199V62.5399C32.45 69.5814 35.2472 76.3345 40.2263 81.3136C45.2054 86.2927 51.9585 89.0899 59 89.0899C66.0415 89.0899 72.7946 86.2927 77.7737 81.3136C82.7528 76.3345 85.55 69.5814 85.55 62.5399V57.8199C85.55 57.0375 85.2392 56.2872 84.686 55.734C84.1327 55.1807 83.3824 54.8699 82.6 54.8699C81.8176 54.8699 81.0673 55.1807 80.514 55.734C79.9608 56.2872 79.65 57.0375 79.65 57.8199V62.5399C79.65 68.0167 77.4744 73.2691 73.6018 77.1417C69.7291 81.0143 64.4767 83.1899 59 83.1899C53.5233 83.1899 48.2709 81.0143 44.3983 77.1417C40.5256 73.2691 38.35 68.0167 38.35 62.5399V57.8199C38.35 57.0375 38.0392 56.2872 37.486 55.734C36.9327 55.1807 36.1824 54.8699 35.4 54.8699C34.6176 54.8699 33.8673 55.1807 33.314 55.734C32.7608 56.2872 32.45 57.0375 32.45 57.8199Z"
        fill="#A5A1F5"
      />
      <Mask id="mask0" maskUnits="userSpaceOnUse" x={32} y={54} width={54} height={36}>
        <Path
          d="M32.45 57.8199V62.5399C32.45 69.5814 35.2472 76.3345 40.2263 81.3136C45.2054 86.2927 51.9585 89.0899 59 89.0899C66.0415 89.0899 72.7946 86.2927 77.7737 81.3136C82.7528 76.3345 85.55 69.5814 85.55 62.5399V57.8199C85.55 57.0375 85.2392 56.2872 84.686 55.734C84.1327 55.1807 83.3824 54.8699 82.6 54.8699C81.8176 54.8699 81.0673 55.1807 80.514 55.734C79.9608 56.2872 79.65 57.0375 79.65 57.8199V62.5399C79.65 68.0167 77.4744 73.2691 73.6018 77.1417C69.7291 81.0143 64.4767 83.1899 59 83.1899C53.5233 83.1899 48.2709 81.0143 44.3983 77.1417C40.5256 73.2691 38.35 68.0167 38.35 62.5399V57.8199C38.35 57.0375 38.0392 56.2872 37.486 55.734C36.9327 55.1807 36.1824 54.8699 35.4 54.8699C34.6176 54.8699 33.8673 55.1807 33.314 55.734C32.7608 56.2872 32.45 57.0375 32.45 57.8199Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask0)">
        <Path d="M59.59 55.4599C59.59 74 59.59 89.5 59.59 107.38H89.68V55.4599H59.59Z" fill="#8B87E8" />
      </G>

      {/* Stem */}
      <Path d="M56.05 84.96H61.95V100.3H56.05V84.96Z" fill="#A5A1F5" />
      <Mask id="mask1" maskUnits="userSpaceOnUse" x={56} y={84} width={6} height={17}>
        <Path d="M56.05 84.96H61.95V100.3H56.05V84.96Z" fill="white" />
      </Mask>
      <G mask="url(#mask1)">
        <Path d="M59.59 55.46C59.59 73.5 59.59 89.5 59.59 107.38H89.68V55.46H59.59Z" fill="#8B87E8" />
      </G>

      {/* Base bar */}
      <Path
        d="M42.48 97.94H75.52C76.3024 97.94 77.0528 98.2508 77.606 98.804C78.1592 99.3572 78.47 100.108 78.47 100.89C78.47 101.672 78.1592 102.423 77.606 102.976C77.0528 103.529 76.3024 103.84 75.52 103.84H42.48C41.6976 103.84 40.9473 103.529 40.3941 102.976C39.8408 102.423 39.53 101.672 39.53 100.89C39.53 100.108 39.8408 99.3572 40.3941 98.804C40.9473 98.2508 41.6976 97.94 42.48 97.94Z"
        fill="#A5A1F5"
      />
      <Mask id="mask2" maskUnits="userSpaceOnUse" x={39} y={97} width={40} height={7}>
        <Path
          d="M42.48 97.94H75.52C76.3024 97.94 77.0528 98.2508 77.606 98.804C78.1592 99.3572 78.47 100.108 78.47 100.89C78.47 101.672 78.1592 102.423 77.606 102.976C77.0528 103.529 76.3024 103.84 75.52 103.84H42.48C41.6976 103.84 40.9473 103.529 40.3941 102.976C39.8408 102.423 39.53 101.672 39.53 100.89C39.53 100.108 39.8408 99.3572 40.3941 98.804C40.9473 98.2508 41.6976 97.94 42.48 97.94Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask2)">
        <Path d="M59.59 55.46C59.59 74.5001 59.59 89.5001 59.59 107.38H89.68V55.46H59.59Z" fill="#8B87E8" />
      </G>

      {/* Mic body */}
      <Path
        d="M74.34 35.3999C74.34 26.9279 67.472 20.0599 59 20.0599C50.5279 20.0599 43.66 26.9279 43.66 35.3999V57.8199C43.66 66.292 50.5279 73.1599 59 73.1599C67.472 73.1599 74.34 66.292 74.34 57.8199V35.3999Z"
        fill="#A5A1F5"
      />
      <Mask id="mask3" maskUnits="userSpaceOnUse" x={43} y={20} width={32} height={54}>
        <Path
          d="M43.66 35.3999C43.66 31.3315 45.2761 27.4297 48.153 24.5529C51.0298 21.6761 54.9316 20.0599 59 20.0599C63.0684 20.0599 66.9702 21.6761 69.847 24.5529C72.7238 27.4297 74.34 31.3315 74.34 35.3999V57.8199C74.34 61.8884 72.7238 65.7901 69.847 68.6669C66.9702 71.5438 63.0684 73.1599 59 73.1599C54.9316 73.1599 51.0298 71.5438 48.153 68.6669C45.2761 65.7901 43.66 61.8884 43.66 57.8199V35.3999Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask3)">
        <Path d="M64.9 15.3399C70.21 31.8599 70.21 57.8199 61.95 77.8799H77.88V15.3399H64.9Z" fill="#8B87E8" />
      </G>

      {/* Face (eyes + mouth) — animated left-right shake */}
      <AnimatedG style={faceStyle}>
        {/* Eyes (angry arrows) */}
        <Path
          d="M50.74 38.9399L56.05 42.4799L50.74 46.0199"
          stroke="#16144F"
          strokeWidth={2.655}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M67.26 38.9399L61.95 42.4799L67.26 46.0199"
          stroke="#16144F"
          strokeWidth={2.655}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Mouth — static wavy line */}
        <Path
          d="M51.92 54.28C53.4933 52.3133 55.0666 52.3133 56.64 54.28C58.2133 56.2466 59.7866 56.2466 61.36 54.28C62.9333 52.3133 64.5066 52.3133 66.08 54.28"
          stroke="#16144F"
          strokeWidth={2.655}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </AnimatedG>

      {/* Left zigzag — vertical shake + waving path */}
      <AnimatedG style={leftZigStyle}>
        <AnimatedPath
          animatedProps={leftZigProps}
          stroke="#E8FF7A"
          strokeWidth={3.54}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </AnimatedG>

      {/* Right zigzag — vertical shake + waving path */}
      <AnimatedG style={rightZigStyle}>
        <AnimatedPath
          animatedProps={rightZigProps}
          stroke="#E8FF7A"
          strokeWidth={3.54}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </AnimatedG>
    </Svg>
  );
}
