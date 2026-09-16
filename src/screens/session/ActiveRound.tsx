/**
 * The in-round view, driven entirely by the session store's phase:
 * preparing → playing → (waiting) → (countdown) → listening → evaluating
 * → round-result. One layout for all eight exercises.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  exerciseById,
  useEarTrainingStore,
  type NoteOutcome,
} from '@/features/ear-training';
import { colorForCents } from '@/shared/lib/music';
import { palette as themePalette, useTheme } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

interface SessionControls {
  hearAgain(): void;
  answer(optionId: string): void;
  exit(): void;
}

/** which chord tones / melody notes are already in, shown live while singing */
function OutcomeDots({ outcomes }: { outcomes: NoteOutcome[] }) {
  const { palette, spacing } = useTheme();
  const color = (o: NoteOutcome) =>
    o.status === 'hit' ? palette.accent : o.status === 'close' ? palette.warning : o.status === 'extra' ? palette.danger : palette.textFaint;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md, flexWrap: 'wrap' }}>
      {outcomes.map((o, i) => (
        <AppText key={i} variant="caption" color={color(o)}>
          {o.status === 'hit' ? '●' : o.status === 'close' ? '◐' : o.status === 'extra' ? '+' : '○'} {o.label}
        </AppText>
      ))}
    </View>
  );
}

export function ActiveRound({ session }: { session: SessionControls }) {
  const { palette, spacing } = useTheme();

  const phase = useEarTrainingStore((s) => s.phase);
  const exerciseId = useEarTrainingStore((s) => s.exerciseId);
  const round = useEarTrainingStore((s) => s.round);
  const totalRounds = useEarTrainingStore((s) => s.totalRounds);
  const instruction = useEarTrainingStore((s) => s.instruction);
  const countdown = useEarTrainingStore((s) => s.countdown);
  const waitSecondsLeft = useEarTrainingStore((s) => s.waitSecondsLeft);
  const choices = useEarTrainingStore((s) => s.choices);
  const live = useEarTrainingStore((s) => s.live);
  const roundResult = useEarTrainingStore((s) => s.roundResult);
  const promptDurationMs = useEarTrainingStore((s) => s.promptDurationMs);
  const promptStartedAt = useEarTrainingStore((s) => s.promptStartedAt);

  const title = exerciseId ? (exerciseById(exerciseId)?.title ?? '') : '';
  const isChoice = choices !== null;

  let headline = '';
  let headlineColor: string = palette.textPrimary;
  let support = ' ';

  switch (phase) {
    case 'preparing':
      headline = 'Getting ready…';
      support = 'warming up the audio';
      break;
    case 'playing':
      headline = 'Listen…';
      break;
    case 'waiting':
      headline = `${waitSecondsLeft ?? 0}`;
      support = 'hold that note in your mind';
      break;
    case 'countdown':
      headline = `${countdown ?? 0}`;
      headlineColor = palette.accent;
      support = 'get ready to sing';
      break;
    case 'listening':
      if (isChoice) {
        headline = instruction;
      } else {
        headline = live.note ?? '♪';
        headlineColor = live.score?.signedCents != null ? colorForCents(live.score.signedCents) : live.note ? palette.accent : palette.textPrimary;
        support = instruction;
      }
      break;
    case 'evaluating':
      headline = '…';
      break;
    case 'round-result':
      headline = roundResult?.label ?? '';
      headlineColor = roundResult?.ok ? palette.accent : palette.warning;
      support = roundResult?.detail ?? ' ';
      break;
  }

  return (
    <>
      <View style={styles.header}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption">
          {round} / {totalRounds}
        </AppText>
      </View>

      <View style={styles.center}>
        <View style={styles.headlineBlock}>
          {phase === 'playing' && promptDurationMs && promptStartedAt ? (
            <PromptCountdown durationMs={promptDurationMs} startedAt={promptStartedAt}>
              <AppText
                variant="display"
                color={headlineColor}
                style={{ fontSize: 44, textAlign: 'center' }}
              >
                {headline}
              </AppText>
            </PromptCountdown>
          ) : (
            <AppText
              variant="display"
              color={headlineColor}
              style={{ fontSize: phase === 'listening' && isChoice ? 30 : 44, textAlign: 'center' }}
            >
              {headline}
            </AppText>
          )}
        </View>
        <AppText variant="body" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          {support}
        </AppText>

        {/* fixed-height slot for auxiliary info so layout never shifts */}
        <View style={styles.auxBlock}>
          {phase === 'listening' && !isChoice && (
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {live.score && live.score.actual !== '—' ? `score so far: ${live.score.score}` : 'any octave is fine'}
            </AppText>
          )}
          {phase === 'listening' && live.outcomes && <OutcomeDots outcomes={live.outcomes} />}
          {phase === 'round-result' && roundResult && roundResult.actual !== '—' && (
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              target {roundResult.expected} · you {roundResult.actual}
            </AppText>
          )}
        </View>
      </View>

      {phase === 'listening' && isChoice && (
        <View style={[styles.row, { gap: spacing.md }]}>
          {choices.map((c) => (
            <Button key={c.id} title={c.label} style={{ flex: 1 }} onPress={() => session.answer(c.id)} />
          ))}
        </View>
      )}

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Button title="Hear it again" variant="ghost" onPress={() => session.hearAgain()} />
        <Button title="End" variant="ghost" onPress={() => session.exit()} />
      </View>
    </>
  );
}

const RING_PADDING = 32;
const RING_STROKE = 3;

function PromptCountdown({
  durationMs,
  startedAt,
  children,
}: {
  durationMs: number;
  startedAt: number;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const size = width - RING_PADDING * 2;
  const radius = (size - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startedAt;
    const p = Math.min(elapsed / durationMs, 1);
    setProgress(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [durationMs, startedAt]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={themePalette.accent}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center' },
  headlineBlock: { justifyContent: 'center', alignItems: 'center' },
  /** reserve space for score caption + outcome dots so they don't push layout */
  auxBlock: { minHeight: 64, justifyContent: 'center' },
  row: { flexDirection: 'row' },
});
