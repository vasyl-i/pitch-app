import { PropsWithChildren, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticWarning } from '@/shared/audio';
import { AppText, Button } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { ParseKeys } from 'i18next';
import { useMicCalibration, type CalibrationStatus } from '../lib/calibration';
import { AudioManager } from 'react-native-audio-api';
import {
    MicChecking,
    MicListenQuiet,
    MicTooNoisy,
    MicTooNoisySvg,
    MicPermissionDenied,
    MicError,
    MusicNote
} from '../../../../assets/svg';


const COPY: Record<string, { title: ParseKeys; body: ParseKeys }> = {
    checking: { title: 'vocalRange.mic.checkingTitle', body: 'vocalRange.mic.checkingBody' },
    'listen-quiet': { title: 'vocalRange.mic.quietTitle', body: 'vocalRange.mic.quietBody' },
    'listen-level': { title: 'vocalRange.mic.humTitle', body: 'vocalRange.mic.humBody' },
    'too-noisy': { title: 'vocalRange.mic.noisyTitle', body: 'vocalRange.mic.noisyBody' },
    'too-quiet': { title: 'vocalRange.mic.tooQuietTitle', body: 'vocalRange.mic.tooQuietBody' },
    error: { title: 'vocalRange.mic.errorTitle', body: 'vocalRange.mic.errorBody' },
};

/**
 * Gates its children behind a quick mic check: permission, ambient noise
 * floor, and input level. Shown once, before the first detection screen —
 * detection itself still runs its own per-frame confidence/stability gating,
 * but catching "the room is too loud" or "the mic is basically off" up front
 * avoids a frustrating detection attempt that was doomed from the start.
 */
export interface MicCalibrationGateProps extends PropsWithChildren {
    /** DEV ONLY: override the calibration status to preview specific states */
    __devStatusOverride?: CalibrationStatus;
}

export function MicCalibrationGate({ children, __devStatusOverride }: MicCalibrationGateProps) {
    const { t } = useTranslation();
    const { palette, spacing, radii, gradient } = useTheme();
    const calibration = useMicCalibration({ skip: !!__devStatusOverride });
    const status = __devStatusOverride ?? calibration.status;
    const { errorMessage, level, retry } = calibration;

    useEffect(() => {
        if (status === 'too-noisy' || status === 'too-quiet' || status === 'error' || status === 'permission-denied') {
            hapticWarning();
        }
    }, [status]);

    if (status === 'ok') return <>{children}</>;

    if (status === 'permission-denied') {
        return (
            <View style={styles.center}>
                <MicPermissionDenied size={118}/>
                <AppText variant="title" gradient style={{
                    textAlign: 'center',
                    fontSize: 40,
                    fontFamily: typography.family.bold,
                    lineHeight: 40
                }}>
                    {t('vocalRange.mic.neededTitle')}
                </AppText>
                <AppText variant="body" color={palette.textSecondaryElevated}
                         style={{ fontSize: 20, marginTop: spacing.sm, textAlign: 'center' }}>
                    {t('vocalRange.mic.neededBody')}
                </AppText>
                <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.md }}>
                    <Button title={t('common.openSettings')} onPress={() => void Linking.openSettings()}/>
                    <Button title={t('common.tryAgain')} variant="transparent" onPress={retry}/>
                </View>
            </View>
        );
    }

    const copy = COPY[status] ?? COPY.checking;
    const warning = status === 'too-noisy' || status === 'too-quiet' || status === 'error';
    const isHumming = status === 'listen-level';


    return (
        <View style={styles.center}>
            {isHumming ? (
                <MusicNote size={118}/>
            ) : status === 'checking' ? (
                <MicChecking size={118}/>
            ) : status === 'listen-quiet' ? (
                <MicListenQuiet size={118}/>
            ) : status === 'too-quiet' ? (
                <MicTooNoisy size={118}/>
            ) : status === 'too-noisy' ? (
                <MicTooNoisySvg size={118}/>
            ) : status === 'error' ? (
                <MicError size={118}/>
            ) : <MicChecking size={118}/>}
            <AppText variant="title" gradient
                     style={{ textAlign: 'center', fontSize: 40, fontFamily: typography.family.bold, lineHeight: 40 }}>
                {t(copy.title)}
            </AppText>
            <AppText variant="body" color={palette.textSecondaryElevated}
                     style={{ fontSize: 20, marginTop: spacing.sm, textAlign: 'center' }}>
                {t(copy.body)}
            </AppText>

            {isHumming && (
                <View style={[styles.meterTrack, {
                    backgroundColor: palette.borderSubtle,
                    borderRadius: radii.pill,
                    marginTop: spacing.xl
                }]}>
                    <View style={[styles.meterFill, {
                        width: `${Math.round(level * 100)}%`,
                        borderRadius: radii.pill,
                        overflow: 'hidden'
                    }]}>
                        <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}/>
                    </View>
                </View>
            )}

            {warning && (
                <View style={{ marginTop: spacing.xl, width: '100%' }}>
                    <Button variant="transparent" title={t('common.tryAgain')} onPress={retry}/>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 24 },
    meterTrack: { width: '100%', height: 10, overflow: 'hidden' },
    meterFill: { height: '100%' },
});
