import { PropsWithChildren, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticWarning } from '@/shared/audio';
import { AppText, Button } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
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


const COPY: Record<string, { title: string; body: string }> = {
    checking: { title: 'Checking your microphone…', body: 'One moment.' },
    'listen-quiet': { title: 'Give us a second of quiet…', body: 'Stay still — we’re measuring the room.' },
    'listen-level': { title: 'Now hum any note', body: 'Comfortably loud, like you would when practicing.' },
    'too-noisy': {
        title: 'This space is a little noisy',
        body: 'Find somewhere quieter, or move away from fans and traffic, then try again.'
    },
    'too-quiet': {
        title: 'We barely picking up your voice',
        body: 'Move closer to the microphone, or check that it isn’t muted, then try again.'
    },
    error: { title: 'Couldn’t reach the microphone', body: 'Something went wrong starting the recorder.' },
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
                    Microphone access needed
                </AppText>
                <AppText variant="body" color={palette.textSecondaryElevated}
                         style={{ fontSize: 20, marginTop: spacing.sm, textAlign: 'center' }}>
                    {errorMessage ?? 'Enable microphone access in Settings to measure your vocal range.'}
                </AppText>
                <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.md }}>
                    <Button title="Open Settings" onPress={() => void Linking.openSettings()}/>
                    <Button title="Try again" variant="transparent" onPress={retry}/>
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
                {copy.title}
            </AppText>
            <AppText variant="body" color={palette.textSecondaryElevated}
                     style={{ fontSize: 20, marginTop: spacing.sm, textAlign: 'center' }}>
                {copy.body}
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
                    <Button variant="transparent" title="Try again" onPress={retry}/>
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
