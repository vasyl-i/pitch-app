import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore, type VocalProfile } from '@/entities/profile';
import { AppText, Button } from '@/shared/ui';
import { palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';

/** "Off day?": temporarily narrow the range when tired or sick, and undo it */
export function OffDayAdjuster({ adjustment }: { adjustment: VocalProfile['temporaryAdjustment'] }) {
  const { t } = useTranslation();
  const setTemporaryAdjustment = useProfileStore((s) => s.setTemporaryAdjustment);
  const narrow = (reason: 'tired' | 'sick', insetSemitones: number) => setTemporaryAdjustment({ insetSemitones, reason, setAt: Date.now() });

  return (
    <>
      <AppText variant="caption" style={styles.title}>
        {t('vocalRange.settings.offTitle')}
      </AppText>
      <AppText variant="body" style={styles.body}>
        {t('vocalRange.settings.offBody')}
      </AppText>
      <View style={styles.row}>
        <ReasonChip label={t('vocalRange.settings.tired')} active={adjustment?.reason === 'tired'} onPress={() => narrow('tired', 2)} />
        <ReasonChip label={t('vocalRange.settings.sick')} active={adjustment?.reason === 'sick'} onPress={() => narrow('sick', 4)} />
      </View>
      {adjustment && (
        <Button title={t('vocalRange.settings.backToNormal')} variant="ghost" onPress={() => setTemporaryAdjustment(null)} style={styles.reset} />
      )}
    </>
  );
}

function ReasonChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const color = active ? palette.accent : palette.textFaint;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.activeChip, pressed && styles.pressed]}>
      <Ionicons name="musical-note" size={14} color={color} />
      <AppText variant="caption" color={color} style={styles.chipLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xl },
  body: { marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.surface,
  },
  activeChip: { backgroundColor: palette.accentTint },
  pressed: { opacity: 0.7 },
  chipLabel: { marginLeft: 6 },
  reset: { marginTop: spacing.md },
});
