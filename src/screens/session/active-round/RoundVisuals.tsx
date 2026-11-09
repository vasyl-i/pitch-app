import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { NoteOutcome, RoundScore, RoundVerdict } from '@/features/ear-training';
import { AppText } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeInRight, FadeOut, FadeOutLeft } from 'react-native-reanimated';


const MASCOTS: Record<RoundVerdict, number> = {
    love: require('../../../../assets/love-it.png'),
    almost: require('../../../../assets/almost.png'),
    retry: require('../../../../assets/try-once-more.png'),
    unheard: require('../../../../assets/couldnt-hear-you.png'),
};

// bundled .lottie assets: decoded natively, not stringified/parsed on the main thread like JSON objects
// (a require() number is supported at runtime, but missing from the library's source type)
const MASCOTS_LOTTIE: Record<RoundVerdict, number | undefined> = {
    love: require('../../../../assets/lottie/love-it.lottie'),
    almost: require('../../../../assets/lottie/almost-cat.lottie'),
    retry: require('../../../../assets/lottie/try-again.lottie'),
    unheard: require('../../../../assets/lottie/cat-no-sound.lottie'),
}

const VERDICT_COLORS: Record<RoundVerdict, string> = {
    love: palette.accent,
    almost: palette.caution,
    retry: palette.danger,
    unheard: palette.textSecondaryElevated,
};

/** a big count (the hold before singing, the count-in) */
export function BigCount({ value, color }: { value: number; color: string }) {
    return (
        <AppText variant="display" color={color} center>
            {value}
        </AppText>
    );
}

/** the note being sung, coloured by accuracy, and the live score under it */
export function SingBackDisplay({ note, color, score }: { note: string | null; color: string; score: number | null }) {
    const { t } = useTranslation();
    return (
        <View style={styles.singBack}>
            <View style={styles.noteBox}>
                <AppText variant="score" weight="black" color={color} center>
                    {note ?? '♪'}
                </AppText>
            </View>
            <AppText variant="caption" color={palette.white}>
                {score !== null ? t('session.round.accuracy', { score }) : ' '}
            </AppText>
        </View>
    );
}

const LOTTIE_SOURCES = Object.values(MASCOTS_LOTTIE).filter((s): s is number => s !== undefined);

/**
 * Warms the Lottie mascots before the first result: a hidden, paused view per
 * animation makes the native side load and cache each file now, so the first
 * real mount is a cache hit instead of a stall. Unmounts once all have loaded.
 */
export function MascotPreloader() {
    const [pending, setPending] = useState(LOTTIE_SOURCES.length);
    if (pending <= 0) return null;
    const settled = () => setPending((n) => n - 1);
    return (
        <View style={styles.preload} pointerEvents="none">
            {LOTTIE_SOURCES.map((source) => (
                <LottieView
                    key={source}
                    source={source as unknown as { uri: string }}
                    autoPlay={false}
                    style={styles.preloadView}
                    onAnimationLoaded={settled}
                    onAnimationFailure={settled}
                />
            ))}
        </View>
    );
}

const Mascot = ({ verdict }: { verdict: RoundVerdict }) => {
    const lottie = MASCOTS_LOTTIE[verdict];
    if (lottie) {
        return (
            <View style={styles.mascot}>
                <LottieView source={lottie as unknown as { uri: string }} autoPlay loop style={{ width: '100%', height: '100%' }}/>
            </View>
        );
    }
    return <Image source={MASCOTS[verdict]} style={styles.mascot} resizeMode="contain"/>
}

/** the round's verdict: mascot, label, detail, and target vs what was sung */
export function RoundResult({ result, instantExit = false }: { result: RoundScore | null; instantExit?: boolean }) {
    const { t } = useTranslation();
    if (!result) return null;
    const color = VERDICT_COLORS[result.verdict] ?? (result.ok ? palette.accent : palette.warning);
    return (
        <View style={[styles.result, instantExit && styles.hidden]}>
            <Animated.View entering={FadeIn} exiting={instantExit ? undefined : FadeOut}>
                <Mascot verdict={result.verdict}/>
            </Animated.View>
            <Animated.View entering={FadeIn} exiting={instantExit ? undefined : FadeOut.delay(100)}>
                <AppText variant="headline" weight="black" color={color} center>
                    {result.label}
                </AppText>
            </Animated.View>
            <Animated.View entering={FadeIn} exiting={instantExit ? undefined : FadeOut.delay(200)}>
                <AppText variant="caption" color={palette.textSecondary} center style={styles.detail}>
                    {result.detail}
                </AppText>
            </Animated.View>
            {
                result.expected && result.actual !== '—' && (
                    <Animated.View entering={FadeIn} exiting={instantExit ? undefined : FadeOut.delay(300)}>
                        <AppText variant="caption" center style={styles.comparison}>
                            {t('session.round.targetVsResult', { expected: result.expected, actual: result.actual })}
                        </AppText>
                    </Animated.View>
                )
            }
        </View>
    )
        ;
}

const OUTCOME_GLYPH: Partial<Record<NoteOutcome['status'], string>> = { hit: '●', close: '◐', extra: '+' };

/** per-note marks for chord and melody drills: hit, close, extra, missed */
export function OutcomeDots({ outcomes }: { outcomes: NoteOutcome[] }) {
    const color = (o: NoteOutcome) =>
        o.status === 'hit' ? palette.accent : o.status === 'close' ? palette.warning : o.status === 'extra' ? palette.danger : palette.textFaint;
    return (
        <View style={styles.dots}>
            {outcomes.length > 0 ? (
                outcomes.map((o, i) => (
                    <AppText key={i} variant="caption" color={color(o)}>
                        {OUTCOME_GLYPH[o.status] ?? '○'} {o.label}
                    </AppText>
                ))
            ) : (
                <AppText variant="caption"> </AppText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    singBack: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.xs },
    noteBox: { height: 60, overflow: 'visible', justifyContent: 'center' },
    result: { alignItems: 'center', gap: spacing.xs },
    hidden: { opacity: 0 },
    preload: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
    preloadView: { width: 1, height: 1 },
    mascot: { width: 140, height: 140, marginBottom: spacing.md },
    detail: { marginTop: spacing.xs },
    comparison: { marginTop: spacing.sm },
    dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md, flexWrap: 'wrap' },
});
