/**
 * The in-round view, driven entirely by the session store's phase:
 * preparing → playing → (waiting) → (countdown) → listening → evaluating
 * → round-result. One layout for all exercises.
 */
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { palette, spacing } from '@/shared/theme';
import { AppText, Button, COMPACT_SCREEN } from '@/shared/ui';
import { VoiceWaveform } from '@/shared/ui/VoiceWaveform';
import { useRoundView } from './useRoundView';
import { BigCount, OutcomeDots, RoundResult, SingBackDisplay } from './RoundVisuals';

interface SessionControls {
  hearAgain(): void;
  next(): void;
  answer(optionId: string): void;
  exit(): void;
}

export function ActiveRound({ session }: { session: SessionControls }) {
  const { t } = useTranslation();
  const view = useRoundView();
  const singing = view.phase === 'listening' && !view.isChoice;
  const showWaveform = view.phase === 'listening' && view.needsMic;

  return (
    <View style={styles.container}>
      <View style={[styles.header, COMPACT_SCREEN && styles.compactHeader]}>
        <AppText variant="caption" color={palette.white}>
          {t('session.round.counter', { round: view.round, total: view.totalRounds })}
        </AppText>
      </View>
      {!view.isResult && (
        <View style={COMPACT_SCREEN ? styles.compactTitleBlock : styles.titleBlock}>
          <AppText variant="headline" weight="black" center gradient>
            {view.title}
          </AppText>
          <AppText variant="heading" weight="regular" color={palette.textSecondary} center style={styles.subtitle}>
            {view.subtitle}
          </AppText>
        </View>
      )}

      {/* result phase centres vertically, the others sit higher */}
      <View style={[styles.center, view.isResult && styles.centerResult]}>
        <View style={styles.visual}>
          {view.phase === 'waiting' && <BigCount value={view.waitSecondsLeft} color={palette.textPrimary} />}
          {view.phase === 'countdown' && <BigCount value={view.countdown} color={palette.accent} />}
          {singing && <SingBackDisplay note={view.live.note} color={view.noteColor ?? palette.textPrimary} score={view.liveScore} />}
          {view.isResult && <RoundResult result={view.roundResult} />}
        </View>
        {view.phase === 'listening' && <OutcomeDots outcomes={view.live.outcomes || []} />}
        {/* right below the note so they read together */}
        {view.needsMic && (
          <View style={[styles.waveform, !showWaveform && styles.hidden]} pointerEvents="none">
            <VoiceWaveform active={showWaveform} accentColor={view.noteColor} />
          </View>
        )}
      </View>

      {view.phase === 'listening' && view.choices && (
        <View style={styles.choices}>
          {view.choices.map((c) => (
            <Button key={c.id} title={c.label} style={styles.choice} onPress={() => session.answer(c.id)} />
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title={view.isResult ? t('common.next') : t('session.round.hearAgain')}
          variant="ghost"
          onPress={() => (view.isResult ? session.next() : session.hearAgain())}
        />
        <Button title={t('session.round.stop')} variant="transparent" onPress={() => session.exit()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: spacing.xs, marginBottom: spacing.sm },
  compactHeader: { marginBottom: 0 },
  titleBlock: { alignItems: 'center', marginTop: 60 },
  compactTitleBlock: { alignItems: 'center', marginTop: spacing.md },
  subtitle: { marginTop: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '10%' },
  centerResult: { justifyContent: 'center', paddingTop: 0 },
  visual: { alignItems: 'center', justifyContent: 'center' },
  waveform: { marginHorizontal: -spacing.lg },
  hidden: { opacity: 0 },
  choices: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  choice: { flex: 1 },
  footer: { gap: spacing.md, paddingBottom: spacing.lg },
});
