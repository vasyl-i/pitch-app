import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { palette } from '@/shared/theme';

const CIRCLE_SIZE = 22;

interface ProgressCircleProps {
  completedRounds?: number;
  totalRounds?: number;
  done: boolean;
  trackColor?: string;
  progressColor?: string;
  size?: number;
  strokeWidth?: number;
}

export function ProgressCircle({ completedRounds = 0, totalRounds = 0, done, trackColor, progressColor, size, strokeWidth }: ProgressCircleProps) {
  const track = trackColor ?? palette.borderSubtle;
  const fill = progressColor ?? palette.accent;
  const progress = totalRounds > 0 ? completedRounds / totalRounds : 0;
  const SIZE = size || CIRCLE_SIZE;
  const STROKE_WIDTH = strokeWidth || 1;

  const RADIUS = (SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={[styles.frame, { width: SIZE, height: SIZE }]}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={track}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {progress > 0 && (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={fill}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        )}
      </Svg>
      {done && (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={SIZE / 2} color={fill} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute' },
});
