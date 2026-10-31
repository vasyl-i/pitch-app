import { StyleSheet, View } from 'react-native';
import type { PhraseSummary } from '@/features/staff-practice';
import { AppText, Button, useBottomInset } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { PhraseSummaryCard } from '../PhraseSummaryCard';

interface Action {
  title: string;
  onPress: () => void;
}

/**
 * A card laid over the always-mounted canvas. It fills the screen absolutely,
 * which skips the Screen's bottom padding, so it keeps clear of the home
 * indicator / nav bar itself.
 */
export function Overlay({ children }: { children: React.ReactNode }) {
  const bottomInset = useBottomInset();
  return <View style={[styles.overlay, { paddingBottom: bottomInset }]}>{children}</View>;
}

/** the run heard no voice: try again, or leave (skip the step, when guided) */
export function NoInputOverlay({ onRetry, exits }: { onRetry: () => void; exits: Action[] }) {
  const { t } = useTranslation();
  return (
    <Overlay>
      <AppText variant="body" center>
        {t('staff.noInputTitle')}
      </AppText>
      <AppText variant="caption" color={palette.textSecondary} center style={styles.body}>
        {t('staff.noInputBody')}
      </AppText>
      <View style={styles.actions}>
        <Button title={t('common.tryAgain')} onPress={onRetry} />
        {exits.map((a) => (
          <Button key={a.title} title={a.title} variant="ghost" onPress={a.onPress} />
        ))}
      </View>
    </Overlay>
  );
}

/** the round's result and where to go from it */
export function RoundSummaryOverlay({ summary, roundLabel, primary, secondary, tertiary }: {
  summary: PhraseSummary;
  roundLabel?: string;
  primary: Action;
  secondary: Action;
  tertiary?: Action;
}) {
  return (
    <Overlay>
      <PhraseSummaryCard summary={summary} roundLabel={roundLabel} primary={primary} secondary={secondary} tertiary={tertiary} />
    </Overlay>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  body: { marginTop: spacing.sm },
  actions: { marginTop: spacing.lg, gap: spacing.md },
});
