import { StyleSheet, View } from 'react-native';
import { palette } from '@/shared/theme';

/** a thin rounded track filled to `progress` (0–1) */
export function ProgressBar({ progress, height = 3, color = palette.accent }: { progress: number; height?: number; color?: string }) {
  const rounded = { height, borderRadius: height / 2 };
  return (
    <View style={[styles.track, rounded]}>
      <View style={[rounded, { backgroundColor: color, width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', backgroundColor: palette.borderSubtle },
});
