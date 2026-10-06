import { useEffect } from 'react';
import Svg, { Circle, Path, Mask, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

const FACE_CX = 50.74;
const FACE_CY = 48;

// Level bars — anchor at shared bottom (Y=64.9) so they grow upward only
const BAR_BOTTOM = 64.9;

const EASE = Easing.inOut(Easing.quad);

/**
 * Animated microphone illustration for the "too-noisy" calibration state.
 *
 * - Face (eyes + mouth) looks left → front → right → front in a loop
 * - Level bars gently pulse in scale
 */
export function MicTooNoisy({ size = 118 }: { size?: number }) {
  const faceX = useSharedValue(0);
  const barPulse = useSharedValue(0);

  useEffect(() => {
    // Face: left → pause → center → pause → right → pause → center → pause
    faceX.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 500, easing: EASE }),
        withTiming(-2.5, { duration: 400 }), // hold left
        withTiming(0, { duration: 400, easing: EASE }),
        withTiming(0, { duration: 300 }), // hold center
        withTiming(2.5, { duration: 500, easing: EASE }),
        withTiming(2.5, { duration: 400 }), // hold right
        withTiming(0, { duration: 400, easing: EASE }),
        withTiming(0, { duration: 300 }), // hold center
      ),
      -1,
      false,
    );

    // Bars: gentle breathing
    barPulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: EASE }),
      -1,
      true,
    );
  }, []);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: faceX.value }],
  }));

  // Scale from bottom edge so bars grow upward only
  const bar1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: BAR_BOTTOM },
      { scaleY: 1 + barPulse.value * 0.08 },
      { translateY: -BAR_BOTTOM },
    ],
  }));

  const bar2Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: BAR_BOTTOM },
      { scaleY: 1 - barPulse.value * 0.1 },
      { translateY: -BAR_BOTTOM },
    ],
  }));

  const bar3Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: BAR_BOTTOM },
      { scaleY: 1 + barPulse.value * 0.12 },
      { translateY: -BAR_BOTTOM },
    ],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      {/* Mic arc */}
      <Path
        d="M24.1901 57.8199V62.5399C24.1901 69.5814 26.9873 76.3345 31.9664 81.3136C36.9455 86.2927 43.6986 89.0899 50.7401 89.0899C57.7816 89.0899 64.5347 86.2927 69.5137 81.3136C74.4928 76.3345 77.2901 69.5814 77.2901 62.5399V57.8199C77.2901 57.0375 76.9793 56.2872 76.426 55.734C75.8728 55.1807 75.1224 54.8699 74.3401 54.8699C73.5577 54.8699 72.8073 55.1807 72.2541 55.734C71.7009 56.2872 71.3901 57.0375 71.3901 57.8199V62.5399C71.3901 68.0167 69.2144 73.2691 65.3418 77.1417C61.4692 81.0143 56.2168 83.1899 50.7401 83.1899C45.2633 83.1899 40.0109 81.0143 36.1383 77.1417C32.2657 73.2691 30.0901 68.0167 30.0901 62.5399V57.8199C30.0901 57.0375 29.7793 56.2872 29.226 55.734C28.6728 55.1807 27.9225 54.8699 27.1401 54.8699C26.3577 54.8699 25.6073 55.1807 25.0541 55.734C24.5009 56.2872 24.1901 57.0375 24.1901 57.8199Z"
        fill="#A5A1F5"
      />
      <Mask id="mask0" maskUnits="userSpaceOnUse" x={24} y={54} width={54} height={36}>
        <Path
          d="M24.1901 57.8199V62.5399C24.1901 69.5814 26.9873 76.3345 31.9664 81.3136C36.9455 86.2927 43.6986 89.0899 50.7401 89.0899C57.7816 89.0899 64.5347 86.2927 69.5137 81.3136C74.4928 76.3345 77.2901 69.5814 77.2901 62.5399V57.8199C77.2901 57.0375 76.9793 56.2872 76.426 55.734C75.8728 55.1807 75.1224 54.8699 74.3401 54.8699C73.5577 54.8699 72.8073 55.1807 72.2541 55.734C71.7009 56.2872 71.3901 57.0375 71.3901 57.8199V62.5399C71.3901 68.0167 69.2144 73.2691 65.3418 77.1417C61.4692 81.0143 56.2168 83.1899 50.7401 83.1899C45.2633 83.1899 40.0109 81.0143 36.1383 77.1417C32.2657 73.2691 30.0901 68.0167 30.0901 62.5399V57.8199C30.0901 57.0375 29.7793 56.2872 29.226 55.734C28.6728 55.1807 27.9225 54.8699 27.1401 54.8699C26.3577 54.8699 25.6073 55.1807 25.0541 55.734C24.5009 56.2872 24.1901 57.0375 24.1901 57.8199Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask0)">
        <Path d="M51.1331 57.0432C50.6578 75.0709 51.6084 89.5933 51.6083 107H81V53.5L51.1331 57.0432Z" fill="#8B87E8" />
      </G>

      {/* Stem */}
      <Path d="M47.79 84.96H53.69V100.3H47.79V84.96Z" fill="#A5A1F5" />
      <Mask id="mask1" maskUnits="userSpaceOnUse" x={47} y={84} width={7} height={17}>
        <Path d="M47.79 84.96H53.69V100.3H47.79V84.96Z" fill="white" />
      </Mask>
      <G mask="url(#mask1)">
        <Path d="M51.1831 55.4197C51.1831 73.4058 51.1831 89.3936 51.6605 106.88H81V55L51.1831 55.4197Z" fill="#8B87E8" />
      </G>

      {/* Base bar */}
      <Path
        d="M34.22 97.94H67.26C68.0424 97.94 68.7928 98.2508 69.346 98.804C69.8992 99.3572 70.21 100.108 70.21 100.89C70.21 101.672 69.8992 102.423 69.346 102.976C68.7928 103.529 68.0424 103.84 67.26 103.84H34.22C33.4377 103.84 32.6873 103.529 32.1341 102.976C31.5809 102.423 31.2701 101.672 31.2701 100.89C31.2701 100.108 31.5809 99.3572 32.1341 98.804C32.6873 98.2508 33.4377 97.94 34.22 97.94Z"
        fill="#A5A1F5"
      />
      <Mask id="mask2" maskUnits="userSpaceOnUse" x={31} y={97} width={40} height={7}>
        <Path
          d="M34.22 97.94H67.26C68.0424 97.94 68.7928 98.2508 69.346 98.804C69.8992 99.3572 70.21 100.108 70.21 100.89C70.21 101.672 69.8992 102.423 69.346 102.976C68.7928 103.529 68.0424 103.84 67.26 103.84H34.22C33.4377 103.84 32.6873 103.529 32.1341 102.976C31.5809 102.423 31.2701 101.672 31.2701 100.89C31.2701 100.108 31.5809 99.3572 32.1341 98.804C32.6873 98.2508 33.4377 97.94 34.22 97.94Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask2)">
        <Path d="M50.5 57C50.5 75.5 51.5 88.1201 51.5 106L81.1786 107.377V55.457L50.5 57Z" fill="#8B87E8" />
      </G>

      {/* Mic body */}
      <Path
        d="M66.0801 35.3999C66.0801 26.9279 59.2121 20.0599 50.7401 20.0599C42.268 20.0599 35.4001 26.9279 35.4001 35.3999V57.8199C35.4001 66.292 42.268 73.1599 50.7401 73.1599C59.2121 73.1599 66.0801 66.292 66.0801 57.8199V35.3999Z"
        fill="#A5A1F5"
      />
      <Mask id="mask3" maskUnits="userSpaceOnUse" x={35} y={20} width={32} height={54}>
        <Path
          d="M35.4001 35.3999C35.4001 31.3315 37.0162 27.4297 39.893 24.5529C42.7698 21.6761 46.6716 20.0599 50.7401 20.0599C54.8085 20.0599 58.7103 21.6761 61.5871 24.5529C64.4639 27.4297 66.0801 31.3315 66.0801 35.3999V57.8199C66.0801 61.8884 64.4639 65.7901 61.5871 68.6669C58.7103 71.5438 54.8085 73.1599 50.7401 73.1599C46.6716 73.1599 42.7698 71.5438 39.893 68.6669C37.0162 65.7901 35.4001 61.8884 35.4001 57.8199V35.3999Z"
          fill="white"
        />
      </Mask>
      <G mask="url(#mask3)">
        <Path d="M56.64 15.3399C61.95 31.8599 61.95 57.8199 53.69 77.8799H69.62V15.3399H56.64Z" fill="#8B87E8" />
      </G>

      {/* Face — animated */}
      <AnimatedG style={faceStyle}>
        {/* Left eye */}
        <Circle cx={45.43} cy={42.48} r={1.77} fill="#16144F" />
        {/* Right eye */}
        <Circle cx={56.05} cy={42.48} r={1.77} fill="#16144F" />
        {/* Mouth (open circle) */}
        <Circle cx={50.74} cy={53.69} r={1.888} fill="#16144F" stroke="#16144F" strokeWidth={1.77} />
      </AnimatedG>

      {/* Level bars — animated */}
      <AnimatedG style={bar1Style}>
        <Path
          d="M94.4 58.41C94.4 56.7808 93.0792 55.46 91.45 55.46C89.8208 55.46 88.5 56.7808 88.5 58.41V61.95C88.5 63.5793 89.8208 64.9 91.45 64.9C93.0792 64.9 94.4 63.5793 94.4 61.95V58.41Z"
          fill="#E8FF7A"
        />
      </AnimatedG>
      <AnimatedG style={bar2Style}>
        <Path
          d="M103.25 50.1501C103.25 48.5208 101.929 47.2001 100.3 47.2001C98.6708 47.2001 97.35 48.5208 97.35 50.1501V61.9501C97.35 63.5793 98.6708 64.9001 100.3 64.9001C101.929 64.9001 103.25 63.5793 103.25 61.9501V50.1501Z"
          fill="#C9C6FB"
        />
      </AnimatedG>
      <AnimatedG style={bar3Style}>
        <Path
          d="M112.1 41.8901C112.1 40.2608 110.779 38.9401 109.15 38.9401C107.521 38.9401 106.2 40.2608 106.2 41.8901V61.9501C106.2 63.5793 107.521 64.9001 109.15 64.9001C110.779 64.9001 112.1 63.5793 112.1 61.9501V41.8901Z"
          fill="#C9C6FB"
        />
      </AnimatedG>
    </Svg>
  );
}
