import { useEffect, type PropsWithChildren } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ParseKeys } from 'i18next';
import { hapticWarning } from '@/shared/audio';
import { Button, HeroActions, HeroMessage } from '@/shared/ui';
import { gradient, palette, radii, spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { useMicCalibration, type CalibrationStatus } from '../lib/calibration';
import {
  MicChecking,
  MicError,
  MicListenQuiet,
  MicPermissionDenied,
  MicTooNoisy,
  MicTooNoisySvg,
  MusicNote,
} from '../../../../assets/svg';

const COPY: Record<string, { title: ParseKeys; body: ParseKeys }> = {
  checking: { title: 'vocalRange.mic.checkingTitle', body: 'vocalRange.mic.checkingBody' },
  'listen-quiet': { title: 'vocalRange.mic.quietTitle', body: 'vocalRange.mic.quietBody' },
  'listen-level': { title: 'vocalRange.mic.humTitle', body: 'vocalRange.mic.humBody' },
  'too-noisy': { title: 'vocalRange.mic.noisyTitle', body: 'vocalRange.mic.noisyBody' },
  'too-quiet': { title: 'vocalRange.mic.tooQuietTitle', body: 'vocalRange.mic.tooQuietBody' },
  error: { title: 'vocalRange.mic.errorTitle', body: 'vocalRange.mic.errorBody' },
};

const ILLUSTRATION_SIZE = 118;
const ILLUSTRATIONS: Partial<Record<CalibrationStatus, typeof MicChecking>> = {
  'listen-level': MusicNote,
  'listen-quiet': MicListenQuiet,
  'too-quiet': MicTooNoisy,
  'too-noisy': MicTooNoisySvg,
  error: MicError,
};

const WARNING_STATUSES: readonly CalibrationStatus[] = ['too-noisy', 'too-quiet', 'error'];

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
  const calibration = useMicCalibration({ skip: !!__devStatusOverride });
  const status = __devStatusOverride ?? calibration.status;
  const { level, retry } = calibration;

  useEffect(() => {
    if (WARNING_STATUSES.includes(status) || status === 'permission-denied') hapticWarning();
  }, [status]);

  if (status === 'ok') return <>{children}</>;

  if (status === 'permission-denied') {
    return (
      <HeroMessage
        illustration={<MicPermissionDenied size={ILLUSTRATION_SIZE} />}
        title={t('vocalRange.mic.neededTitle')}
        body={t('vocalRange.mic.neededBody')}
      >
        <HeroActions>
          <Button title={t('common.openSettings')} onPress={() => void Linking.openSettings()} />
          <Button title={t('common.tryAgain')} variant="transparent" onPress={retry} />
        </HeroActions>
      </HeroMessage>
    );
  }

  const copy = COPY[status] ?? COPY.checking;
  const Illustration = ILLUSTRATIONS[status] ?? MicChecking;

  return (
    <HeroMessage illustration={<Illustration size={ILLUSTRATION_SIZE} />} title={t(copy.title)} body={t(copy.body)}>
      {status === 'listen-level' && <LevelMeter level={level} />}
      {WARNING_STATUSES.includes(status) && (
        <HeroActions>
          <Button variant="transparent" title={t('common.tryAgain')} onPress={retry} />
        </HeroActions>
      )}
    </HeroMessage>
  );
}

/** how loud the hum is, 0–1 */
function LevelMeter({ level }: { level: number }) {
  return (
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${Math.round(level * 100)}%` }]}>
        <LinearGradient colors={gradient.accent} start={START} end={END} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

const START = { x: 0, y: 0 };
const END = { x: 1, y: 0 };

const styles = StyleSheet.create({
  meterTrack: {
    width: '100%',
    height: 10,
    overflow: 'hidden',
    marginTop: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: palette.borderSubtle,
  },
  meterFill: { height: '100%', borderRadius: radii.pill, overflow: 'hidden' },
});
