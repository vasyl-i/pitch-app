/**
 * The one results screen every exercise ends on: Score.png cat mascot with
 * score overlay, round-by-round breakdown, coaching, and action buttons.
 */
import { useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
    exerciseById,
    useEarTrainingStore,
    type NoteOutcome,
    type OutcomeStatus,
} from '@/features/ear-training';
import { PremiumGate } from '@/features/subscription';
import { typography, useTheme } from '@/shared/theme';
import { AppText, Button, Card } from '@/shared/ui';
import { MelodyOverlay } from './MelodyOverlay';
import { BlurView } from 'expo-blur';

interface SessionControls {
    retry(): void;

    replayAnswer(roundIndex?: number): void;
}

/** the footer buttons — the host screen decides where the session leads next */
export interface ResultsActions {
    primary: { title: string; onPress: () => void };
    secondary: { title: string; onPress: () => void };
    tertiary?: { title: string; onPress: () => void };
}

const STATUS_GLYPH: Record<OutcomeStatus, string> = {
    hit: '✓',
    close: '~',
    missing: '·',
    extra: '+',
    wrong: '✕',
};

function statusColor(status: OutcomeStatus, palette: {
    accent: string;
    warning: string;
    danger: string;
    textFaint: string
}): string {
    switch (status) {
        case 'hit':
            return palette.accent;
        case 'close':
            return palette.warning;
        case 'missing':
            return palette.textFaint;
        default:
            return palette.danger;
    }
}

function NoteRows({ notes }: { notes: NoteOutcome[] }) {
    const { palette, spacing } = useTheme();
    return (
        <View style={{ gap: spacing.xs }}>
            {notes.map((n, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="caption" color={statusColor(n.status, palette)}>
                        {STATUS_GLYPH[n.status]} {n.label}
                    </AppText>
                    <AppText variant="caption">
                        {n.status === 'missing' ? 'not heard' : n.status === 'extra' ? 'extra' : n.cents === null ? '' : `${n.cents > 0 ? '+' : ''}${n.cents}¢`}
                    </AppText>
                </View>
            ))}
        </View>
    );
}

/** the locked stand-in for the target-vs-sung pitch overlay */
function LockedOverlay({ onPress }: { onPress: () => void }) {
    const { palette, spacing } = useTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Performance overlay — Premium feature"
            accessibilityHint="Opens the Premium plans"
            onPress={onPress}
        >
            {({ pressed }) => (
                <Card variant="highlighted"
                      style={[{ padding: spacing.md, alignItems: 'center', gap: 4 }, pressed && { opacity: 0.85 }]}>
                    <AppText variant="caption" color={palette.accent}>
                        See your pitch traced over the target
                    </AppText>
                    <AppText variant="caption" style={{ fontSize: 12, textAlign: 'center' }}>
                        Premium overlays your attempt on the melody so you can spot exactly where the pitch drifts.
                    </AppText>
                </Card>
            )}
        </Pressable>
    );
}

const ROUND_RESULT_LABELS: Record<string, string> = {
    'Love it!': 'Love it!',
    'Almost': 'Almost',
    'Try once more': 'Try once more',
    'Couldn\'t hear you': 'Couldn\'t hear you',
};

const isSmallScreen = Dimensions.get('screen').height < 700;

export function SessionResults({ session, actions }: { session: SessionControls; actions: ResultsActions }) {
    const { palette, spacing } = useTheme();
    const [expanded, setExpanded] = useState<number | null>(null);

    const exerciseId = useEarTrainingStore((s) => s.exerciseId);
    const results = useEarTrainingStore((s) => s.results);
    const summary = useEarTrainingStore((s) => s.summary);

    if (!summary) return null;
    const title = exerciseId ? (exerciseById(exerciseId)?.title ?? '') : '';
    const scoreColor = summary.overall >= 70 ? palette.accent : palette.textPrimary;

    return (
        <View style={styles.container}>
            <ScrollView style={{ height: "100%" }} contentContainerStyle={{ paddingBottom: 300, paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>
                {/* Score hero with cat mascot */}
                <View style={styles.scoreHero}>
                    <View style={styles.scoreFrame}>
                        <Image
                            source={require('../../../assets/Score.png')}
                            style={isSmallScreen ? styles.scoreMascotSmall : styles.scoreMascot}
                            resizeMode="contain"
                        />
                        {summary.overall >= 70 &&
                            <Image
                                source={require('../../../assets/results-board-overlay.png')}
                                style={styles.scoreColorOverlay}
                                resizeMode="contain"
                                tintColor={'rgb(200 218 89 / 0.1)'}
                            />
                        }
                        <View style={styles.scoreOverlay}>
                            <AppText variant="display" color={scoreColor} style={[styles.scoreNumber]}>
                                {summary.overall}%
                            </AppText>
                            {summary.avgCents !== null && (
                                <AppText variant="caption" color={palette.textSecondaryElevated}>
                                    {summary.avgCents}¢ average off
                                </AppText>
                            )}
                        </View>
                    </View>
                    <AppText variant="caption" color={palette.white} style={{ marginTop: 12 }}>
                        {summary.correctRounds} of {summary.totalRounds} rounds nailed
                    </AppText>
                </View>

                {/* Coaching improvements */}
                {/*{summary.improvements.length > 0 && (*/}
                {/*  <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>*/}
                {/*    {summary.improvements.map((line, i) => (*/}
                {/*      <AppText key={i} variant="caption" color={palette.textSecondary} style={{ textAlign: 'center' }}>*/}
                {/*        {line}*/}
                {/*      </AppText>*/}
                {/*    ))}*/}
                {/*  </View>*/}
                {/*)}*/}

                {/* Round breakdown */}
                <Card style={{ marginTop: spacing.xl, padding: 20, borderRadius: 10 }}>
                    <AppText variant="label" style={{ marginBottom: spacing.md }}>
                        {title}
                    </AppText>
                    {results.map((r, i) => {
                        const isOpen = expanded === i;
                        const displayLabel = ROUND_RESULT_LABELS[r.label] ?? r.label;
                        return (
                            <Pressable key={i} accessibilityRole="button"
                                       onPress={() => setExpanded(isOpen ? null : i)}>
                                <View style={[styles.roundRow, i < results.length - 1 && styles.roundBorder]}>
                                    <AppText variant="caption">Round {i + 1}</AppText>
                                    <AppText variant="caption" color={r.ok ? palette.accent : palette.white}>
                                        {r.score !== 0 ? `${r.score}%` : displayLabel}
                                    </AppText>
                                </View>
                                {isOpen && (
                                    <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
                                        <View style={{ gap: 2 }}>
                                            <AppText variant="caption">target: {r.expected}</AppText>
                                            <AppText variant="caption">you: {r.actual}</AppText>
                                            {r.avgCents !== null &&
                                                <AppText variant="caption">deviation: {r.avgCents}¢</AppText>}
                                        </View>
                                        {r.notes && r.notes.length > 0 && <NoteRows notes={r.notes}/>}
                                        {r.overlay && (
                                            <PremiumGate
                                                feature="performance-overlay"
                                                source="performance-overlay"
                                                fallback={(openPaywall) => <LockedOverlay onPress={openPaywall}/>}
                                            >
                                                <MelodyOverlay target={r.overlay.target} sung={r.overlay.sung}/>
                                            </PremiumGate>
                                        )}
                                        <Button title="Hear the answer" variant="ghost"
                                                onPress={() => session.replayAnswer(i)}/>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </Card>
            </ScrollView>

            {/* Action buttons */}
            <BlurView intensity={10} tint="dark" style={{ gap: 20, paddingTop: spacing.md, position: "absolute", width: "100%", bottom: 0, paddingHorizontal: spacing.lg }}>
                <Button title={actions.primary.title} onPress={actions.primary.onPress}/>
                {actions.secondary && (
                    <Button title={actions.secondary.title} variant="ghost" onPress={actions.secondary.onPress}/>
                )}
                {actions.tertiary && (
                    <Button title={actions.tertiary.title} variant="transparent" onPress={actions.tertiary.onPress}/>
                )}
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scoreHero: {
        alignItems: 'center',
        marginTop: 16,
    },
    scoreFrame: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreMascot: {
        width: 320,
        height: 328,
        marginHorizontal: 55,
    },
    scoreMascotSmall: {
        width: 220,
        height: 226,
        marginHorizontal: 55,
    },
    scoreColorOverlay: {
        position: 'absolute',
        top: 130,
        alignSelf: 'center',
        marginLeft: -6,
        opacity: 1,
    },
    scoreOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreNumber: {
        fontSize: 48,
        fontFamily: typography.family.medium,
    },
    roundRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    roundBorder: {
        // borderBottomWidth: 1,
        // borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
});
