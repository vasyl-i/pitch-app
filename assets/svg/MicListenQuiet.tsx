import { useEffect } from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

// Clock hand pivot point (center of the clock face)
const CX = 59;
const CY = 63.8611;

/**
 * Animated clock illustration for the "listen-quiet" calibration state.
 *
 * The clock hand swings gently left-right (~60 degrees) in a loop.
 */
export function MicListenQuiet({ size = 118 }: { size?: number }) {
  // The SVG hand is drawn ~20° right of vertical, so vertical = -20°.
  // Swing ±60° from vertical: -80° to +40°.
  const rotation = useSharedValue(-80);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(40, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  const handStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: CX },
      { translateY: CY },
      { rotate: `${rotation.value}deg` },
      { translateX: -CX },
      { translateY: -CY },
    ],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 118 118" fill="none">
      {/* Outer circle */}
      <Circle cx={59} cy={59} r={35} fill="#8B87E8" />
      {/* Inner circle */}
      <Circle cx={59} cy={59} r={27.2222} fill="#E7E6F9" />

      {/* Clock hand — animated swing */}
      <AnimatedG style={handStyle}>
        <Path
          d="M59 63.8611L63.3264 52"
          stroke="#16144F"
          strokeWidth={2.67361}
          strokeLinecap="round"
        />
      </AnimatedG>

      {/* Center dot */}
      <Circle cx={59} cy={63.8611} r={3.1597} fill="#16144F" />

      {/* Level bars (bottom) */}
      <Path d="M46.1181 78.2014C46.1181 77.2617 45.3563 76.5 44.4167 76.5C43.477 76.5 42.7153 77.2617 42.7153 78.2014V78.6875C42.7153 79.6272 43.477 80.3889 44.4167 80.3889C45.3563 80.3889 46.1181 79.6272 46.1181 78.6875V78.2014Z" fill="#C9C6FB" />
      <Path d="M53.4097 76.743C53.4097 75.8034 52.648 75.0417 51.7083 75.0417C50.7687 75.0417 50.007 75.8034 50.007 76.743V80.1458C50.007 81.0855 50.7687 81.8472 51.7083 81.8472C52.648 81.8472 53.4097 81.0855 53.4097 80.1458V76.743Z" fill="#C9C6FB" />
      <Path d="M60.7014 75.2847C60.7014 74.3451 59.9397 73.5833 59 73.5833C58.0603 73.5833 57.2986 74.3451 57.2986 75.2847V81.6042C57.2986 82.5438 58.0603 83.3056 59 83.3056C59.9397 83.3056 60.7014 82.5438 60.7014 81.6042V75.2847Z" fill="#8B87E8" />
      <Path d="M67.9931 76.743C67.9931 75.8034 67.2313 75.0417 66.2917 75.0417C65.352 75.0417 64.5903 75.8034 64.5903 76.743V80.1458C64.5903 81.0855 65.352 81.8472 66.2917 81.8472C67.2313 81.8472 67.9931 81.0855 67.9931 80.1458V76.743Z" fill="#C9C6FB" />
      <Path d="M75.2847 78.2014C75.2847 77.2617 74.523 76.5 73.5833 76.5C72.6437 76.5 71.8819 77.2617 71.8819 78.2014V78.6875C71.8819 79.6272 72.6437 80.3889 73.5833 80.3889C74.523 80.3889 75.2847 79.6272 75.2847 78.6875V78.2014Z" fill="#C9C6FB" />

      {/* Gauge arcs */}
      <Path d="M41.6241 56.4836C41.9467 54.1615 42.7326 51.9279 43.9351 49.9154C45.1375 47.903 46.7321 46.1526 48.6241 44.7683" stroke="#D6D4F7" strokeWidth={5.83333} strokeLinecap="round" />
      <Path d="M51.8324 42.921C54.0672 41.9295 56.4849 41.4172 58.9297 41.4172C61.3745 41.4172 63.7922 41.9295 66.0269 42.921" stroke="#C9C6FB" strokeWidth={5.83333} strokeLinecap="round" />
      <Path d="M69.2352 44.7683C71.1272 46.1526 72.7218 47.903 73.9243 49.9154C75.1268 51.9279 75.9126 54.1615 76.2352 56.4836" stroke="#8B87E8" strokeWidth={5.83333} strokeLinecap="round" />
    </Svg>
  );
}
