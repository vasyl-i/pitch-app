/**
 * The in-round view, driven entirely by the session store's phase:
 * preparing → playing → (waiting) → (countdown) → listening → evaluating
 * → round-result. One layout for all exercises.
 */
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { exerciseById, type NoteOutcome, useEarTrainingStore, } from '@/features/ear-training';
import { colorForCents } from '@/shared/lib/music';
import { typography, useTheme } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';
import { VoiceWaveform } from '@/shared/ui/VoiceWaveform';

interface SessionControls {
    hearAgain(): void;

    next(): void;

    answer(optionId: string): void;

    exit(): void;
}

/* ---------- result mascot map ---------- */

const MASCOT_IMAGES = {
    'Love it!': require('../../../assets/love-it.png'),
    'Almost': require('../../../assets/almost.png'),
    'Try once more': require('../../../assets/try-once-more.png'),
    'Couldn\'t hear you': require('../../../assets/couldnt-hear-you.png'),
} as Record<string, ReturnType<typeof require>>;

const RESULT_COLORS: Record<string, string> = {
    'Love it!': '#EEFF88',
    'Almost': '#EDA069',
    'Try once more': '#F95F4F',
    'Couldn\'t hear you': '#F0F0F0',
};

/* ---------- outcome dots ---------- */

function OutcomeDots({ outcomes }: { outcomes: NoteOutcome[] }) {
    const { palette, spacing } = useTheme();
    const color = (o: NoteOutcome) =>
        o.status === 'hit' ? palette.accent : o.status === 'close' ? palette.warning : o.status === 'extra' ? palette.danger : palette.textFaint;
    return (
        <View style={{
            flexDirection: 'row',
            gap: spacing.sm,
            justifyContent: 'center',
            marginTop: spacing.md,
            flexWrap: 'wrap'
        }}>
            {outcomes.map((o, i) => (
                <AppText key={i} variant="caption" color={color(o)}>
                    {o.status === 'hit' ? '●' : o.status === 'close' ? '◐' : o.status === 'extra' ? '+' : '○'} {o.label}
                </AppText>
            ))}
        </View>
    );
}

/* ---------- main component ---------- */

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

    const exerciseDef = exerciseId ? exerciseById(exerciseId) : undefined;
    const title = exerciseDef?.title ?? '';
    const isChoice = choices !== null;
    const isResult = phase === 'round-result';
    const needsMic = exerciseDef?.needsMic ?? false;
    const showWaveform = phase === 'listening' && needsMic;
    const isSmallScreen = Dimensions.get('screen').height < 700;

    // note color for waveform accent — blue when no signal, then pitch-accuracy color
    const noteColor = live.score?.signedCents != null
        ? colorForCents(live.score.signedCents)
        : live.note ? palette.accent : undefined;

    /* ---- phase-specific content ---- */

    let subtitle = '';
    let centerContent: React.ReactNode = null;

    switch (phase) {
        case 'preparing':
            subtitle = 'Getting ready...';
            break;
        case 'playing':
            subtitle = 'Listen...';
            // centerContent = <VoiceWaveform active={false}/>;
            break;
        case 'waiting':
            subtitle = 'Hold that note in your mind';
            centerContent = (
                <AppText variant="display" color={palette.textPrimary} style={styles.bigNumber}>
                    {waitSecondsLeft ?? 0}
                </AppText>
            );
            break;
        case 'countdown':
            subtitle = 'Get ready to sing';
            centerContent = (
                <AppText variant="display" color={palette.accent} style={styles.bigNumber}>
                    {countdown ?? 0}
                </AppText>
            );
            break;
        case 'listening':
            if (isChoice) {
                subtitle = instruction;
            } else {
                subtitle = 'Sing it back';
                const noteColor = live.score?.signedCents != null
                    ? colorForCents(live.score.signedCents)
                    : live.note ? palette.accent : palette.textPrimary;
                centerContent = (
                    <View style={styles.singContent}>
                        <View style={{ height: 80, justifyContent: "space-between", gap: 4, alignItems: "center" }}>
                            <View style={{ height: 50 }}>
                            <AppText variant="display" color={noteColor} style={styles.noteDisplay}>
                                {live.note ?? '♪'}
                            </AppText>
                            </View>
                            {(
                                <AppText variant="caption" color={palette.white}>
                                    {live.score && live.score.actual !== '—' ? `${live.score.score}% accuracy` : ' '}
                                </AppText>
                            )}
                        </View>
                    </View>
                );
            }
            break;
        case 'evaluating':
            subtitle = '...';
            break;
        case 'round-result': {
            const label = roundResult?.label ?? '';
            const mascot = MASCOT_IMAGES[label];
            const labelColor = RESULT_COLORS[label] ?? (roundResult?.ok ? palette.accent : palette.warning);
            centerContent = (
                <View style={styles.resultContent}>
                    {mascot && (
                        <Image source={mascot} style={styles.mascot} resizeMode="contain"/>
                    )}
                    <AppText variant="display" color={labelColor} style={styles.resultLabel}>
                        {label}
                    </AppText>
                    {roundResult && (
                        <AppText variant="caption" color={palette.textSecondary}
                                 style={{ textAlign: 'center', marginTop: 4 }}>
                            {roundResult.detail}
                        </AppText>
                    )}
                    {roundResult && roundResult.expected && roundResult.actual !== '—' && (
                        <AppText variant="caption" color={palette.textFaint}
                                 style={{ textAlign: 'center', marginTop: 8 }}>
                            Target note · {roundResult.expected} · Your result · {roundResult.actual}
                        </AppText>
                    )}
                </View>
            );
            break;
        }
    }

    return (
        <View style={styles.container}>
            {/* Fixed top section: round counter + exercise title + subtitle */}
            <View style={[styles.header, isSmallScreen && { marginBottom: 0 }]}>
                <AppText variant="caption" color={palette.white}>
                    Round {round} of {totalRounds}
                </AppText>
            </View>
            {!isResult && (
                <View style={{ alignItems: "center", marginTop: isSmallScreen ? 0 : 60 }}>
                    <AppText variant="display" gradient style={styles.title}>
                        {title}
                    </AppText>
                    <AppText variant="body" color={palette.textSecondary} style={styles.subtitle}>
                        {subtitle}
                    </AppText>
                </View>
            )}

            {/* Center area — flex:1; result phase centers vertically, others sit higher */}
            <View style={[styles.center, isResult && styles.centerResult]}>
                <View style={styles.visualArea}>
                    {centerContent}
                </View>

                {/* Live outcome dots for chord/melody exercises */}
                {phase === 'listening' && live.outcomes && <OutcomeDots outcomes={live.outcomes}/>}

                {/* Waveform — right below note display so they stay close */}
                {needsMic && (
                    <View style={{ opacity: showWaveform ? 1 : 0, marginHorizontal: -spacing.lg }} pointerEvents="none">
                        <VoiceWaveform active={showWaveform} accentColor={noteColor} />
                    </View>
                )}
            </View>

            {/* Choice buttons */}
            {phase === 'listening' && isChoice && (
                <View style={[styles.row, { gap: spacing.md, marginBottom: spacing.md }]}>
                    {choices.map((c) => (
                        <Button key={c.id} title={c.label} style={{ flex: 1 }} onPress={() => session.answer(c.id)}/>
                    ))}
                </View>
            )}

            {/* Footer controls */}
            <View style={styles.footer}>
                <Button title={isResult ? "Next" : "Hear it again"} variant="ghost"
                        onPress={() => isResult ? session.next() : session.hearAgain()}/>
                <Button title="Stop practice" variant="transparent" onPress={() => session.exit()}/>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        alignItems: 'center',
        paddingTop: 4,
        marginBottom: 8,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '10%',
    },
    centerResult: {
        justifyContent: 'center',
        paddingTop: 0,
    },
    title: {
        fontSize: 40,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        textAlign: 'center',
        marginTop: 20,
    },
    visualArea: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bigNumber: {
        fontSize: 64,
        textAlign: 'center',
    },
    singContent: {
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    noteDisplay: {
        fontSize: 48,
        textAlign: 'center',
    },
    resultContent: {
        alignItems: 'center',
        gap: 4,
    },
    mascot: {
        width: 140,
        height: 140,
        marginBottom: 12,
    },
    resultLabel: {
        fontSize: 32,
        textAlign: 'center',
    },
    row: { flexDirection: 'row' },
    footer: {
        gap: 12,
        paddingBottom: 8,
    },
});
