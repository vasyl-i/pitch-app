import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/shared/ui';
import { accentAlpha, typography, useTheme } from '@/shared/theme';
import { midiToName } from '@/shared/lib/music';
import { deriveComfortRange, voiceType } from '@/entities/profile';
import { formatNumber, useTranslation } from '@/shared/i18n';

const isSmallScreen = Dimensions.get('screen').height < 700;

/** Celebratory-but-professional summary of a completed low/high detection. */
export function ResultsCard({ low, high, success }: { low: number; high: number; success?: boolean }) {
    const { t } = useTranslation();
    const { palette, spacing } = useTheme();
    const comfort = deriveComfortRange({ lowMidi: low, highMidi: high });
    const span = high - low;
    const scoreColor = success ? palette.accent : palette.textPrimary;


    return (
        <View style={styles.scoreFrame}>
            <Image
                source={require('../../../../assets/Score.png')}
                style={isSmallScreen ? styles.scoreMascotSmall : styles.scoreMascot}
                resizeMode="contain"
            />
            {success &&
                <Image
                    source={require('../../../../assets/results-board-overlay.png')}
                    style={isSmallScreen ? styles.scoreColorOverlaySmall : styles.scoreColorOverlay}
                    resizeMode="contain"
                    tintColor={accentAlpha(0.05)}
                />
            }
            <View style={styles.scoreOverlay}>
                <AppText color={palette.textSecondaryElevated} style={{ fontSize: 12, lineHeight: 14 }}>
                    {t('vocalRange.results.comfortable')}
                </AppText>
                <AppText color={palette.accent} style={{ fontSize: 40, lineHeight: 42, fontFamily: typography.family.bold }}>
                    {`${midiToName(low)} — ${midiToName(high)}`}
                </AppText>
                <AppText color={palette.textSecondaryElevated} style={{ fontSize: 12, lineHeight: 14 }}>
                    {`${t('vocalRange.semitones', { count: span })} · ${t('vocalRange.octaves', { value: formatNumber(span / 12, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })} · ≈${voiceType({ lowMidi: low, highMidi: high })}`}
                </AppText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    pairRow: { flexDirection: 'row', gap: 10 },
    pairCard: { flex: 1, padding: 16, alignItems: 'center' },
    card: { padding: 18, alignItems: 'center' },
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
    // the small mascot is 220/320 of the full one; the success glow follows it
    scoreColorOverlaySmall: {
        position: 'absolute',
        top: 89,
        width: 195,
        height: 116,
        alignSelf: 'center',
        marginLeft: -4,
    },
    scoreOverlay: {
        position: 'absolute',
        gap: 10,
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
});
