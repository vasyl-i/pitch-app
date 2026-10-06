/**
 * DEV ONLY — Preview all MicCalibrationGate states using the real component.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme';
import { AppText, Screen } from '@/shared/ui';
import { MicCalibrationGate } from '@/features/vocal-range/ui/MicCalibrationGate';
import type { CalibrationStatus } from '@/features/vocal-range/lib/calibration';

const PREVIEW_STATES: CalibrationStatus[] = [
  'checking',
  'listen-quiet',
  'listen-level',
  'too-noisy',
  'too-quiet',
  'permission-denied',
  'error',
];

export function DevMicCalibrationScreen() {
  const { palette, spacing, radii, typography } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<CalibrationStatus>('checking');

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title" gradient={false}>Mic Calibration</AppText>
        <Pressable onPress={() => navigation.goBack()}>
          <AppText variant="label" color={palette.accent} gradient={false}>Close</AppText>
        </Pressable>
      </View>

      {/* State picker */}
      <View style={styles.picker}>
        {PREVIEW_STATES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={[
              styles.chip,
              {
                backgroundColor: s === status ? palette.accent : palette.surfaceElevated,
                borderRadius: radii.pill,
              },
            ]}
          >
            <AppText
              variant="caption"
              color={s === status ? palette.background : palette.textSecondary}
              gradient={false}
              style={{ fontSize: 12, fontFamily: typography.family.medium }}
            >
              {s}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Real MicCalibrationGate with status override */}
      <View style={{ flex: 1 }}>
        <MicCalibrationGate __devStatusOverride={status}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            Calibration passed (ok state)
          </AppText>
        </MicCalibrationGate>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
