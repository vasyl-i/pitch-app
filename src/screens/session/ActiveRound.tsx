/**
 * The in-round view, driven entirely by the session store's phase:
 * preparing → playing → (waiting) → (countdown) → listening → evaluating
 * → round-result. One layout for all exercises.
 */
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { exerciseById, type NoteOutcome, type RoundVerdict, useEarTrainingStore, } from '@/features/ear-training';
import { useTranslation } from '@/shared/i18n';
import { colorForCents } from '@/shared/lib/music';
import { spacing, typography, useTheme } from '@/shared/theme';
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
    love: require('../../../assets/love-it.png'),
    almost: require('../../../assets/almost.png'),
    retry: require('../../../assets/try-once-more.png'),
    unheard: require('../../../assets/couldnt-hear-you.png'),
} as Record<RoundVerdict, ReturnType<typeof require>>;

const RESULT_COLORS: Record<RoundVerdict, string> = {
    love: '#EEFF88',
    almost: '#EDA069',
    retry: '#F95F4F',
    unheard: '#F0F0F0',
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
            {outcomes.length > 0 ? (outcomes.map((o, i) => (
                <AppText key={i} variant="caption" color={color(o)}>
                    {o.status === 'hit' ? '●' : o.status === 'close' ? '◐' : o.status === 'extra' ? '+' : '○'} {o.label}
                </AppText>
            ))) : <AppText variant="caption">{" "}</AppText>}
        </View>
    );
}

/* ---------- main component ---------- */

export function ActiveRound({ session }: { session: SessionControls }) {
    const { t } = useTranslation();
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
            subtitle = t('session.round.preparing');
            break;
        case 'playing':
            subtitle = t('session.round.listen');
            // centerContent = <VoiceWaveform active={false}/>;
            break;
        case 'waiting':
            subtitle = t('session.round.hold');
            centerContent = (
                <AppText variant="display" color={palette.textPrimary} style={styles.bigNumber}>
                    {waitSecondsLeft ?? 0}
                </AppText>
            );
            break;
        case 'countdown':
            subtitle = t('session.round.getReady');
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
                subtitle = t('earTraining.instructions.singBack');
                const noteColor = live.score?.signedCents != null
                    ? colorForCents(live.score.signedCents)
                    : live.note ? palette.accent : palette.textPrimary;
                centerContent = (
                    <View style={styles.singContent}>
                        <View style={{ justifyContent: "flex-start", gap: 4, alignItems: "center" }}>
                            <View style={{ height: 60, overflow: "visible" }}>
                            <AppText variant="display" color={noteColor} style={styles.noteDisplay}>
                                {live.note ?? '♪'}
                            </AppText>
                            </View>
                            {(
                                <AppText variant="caption" color={palette.white}>
                                    {live.score && live.score.actual !== '—' ? t('session.round.accuracy', { score: live.score.score }) : ' '}
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
            const mascot = roundResult ? MASCOT_IMAGES[roundResult.verdict] : undefined;
            const labelColor = (roundResult && RESULT_COLORS[roundResult.verdict]) ?? (roundResult?.ok ? palette.accent : palette.warning);
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
                            {t('session.round.targetVsResult', { expected: roundResult.expected, actual: roundResult.actual })}
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
                    {t('session.round.counter', { round, total: totalRounds })}
                </AppText>
            </View>
            {!isResult && (
                <View style={{ alignItems: "center", marginTop: isSmallScreen ? 12 : 60 }}>
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
                {phase === 'listening' && <OutcomeDots outcomes={live.outcomes || []}/>}

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
                <Button title={isResult ? t('common.next') : t('session.round.hearAgain')} variant="ghost"
                        onPress={() => isResult ? session.next() : session.hearAgain()}/>
                <Button title={t('session.round.stop')} variant="transparent" onPress={() => session.exit()}/>
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
        fontSize: 32,
        lineHeight: 36,
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
        lineHeight: 52,
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
        paddingBottom: spacing.lg,
    },
});
