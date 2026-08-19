/**
 * Mic calibration: verify permission, measure the room's ambient noise floor,
 * then confirm the input level actually rises when the singer makes a sound.
 * Runs automatically right before guided detection, satisfying "check the
 * mic before detection starts" without adding its own onboarding step — the
 * whole flow still needs to read as five screens and finish in under two
 * minutes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireMic, MicPermissionError, type MicLease } from '@/features/pitch-detection';
import { micActive, micRms } from '@/shared/lib/micRmsBus';
import { AudioManager } from 'react-native-audio-api';

export type CalibrationStatus =
  | "initial"
  | 'checking'
  | 'listen-quiet'
  | 'listen-level'
  | 'ok'
  | 'too-noisy'
  | 'too-quiet'
  | 'permission-denied'
  | 'error';

const QUIET_STAGE_MS = 700;
const LEVEL_STAGE_MS = 1800;
/** ambient rms above this reads as a noisy room, not just quiet electronics hiss */
const NOISY_FLOOR_RMS = 0.02;
/** the level stage must clear the ambient floor by at least this multiple */
const MIN_LEVEL_MARGIN = 2.5;
const ABS_MIN_LEVEL_RMS = 0.01;

export interface CalibrationState {
  status: CalibrationStatus;
  errorMessage: string | null;
  /** 0..1 meter for the "make a sound" stage, so the UI can show a live level bar */
  level: number;
  retry: () => void;
}

export function useMicCalibration(): CalibrationState {
  const [status, setStatus] = useState<CalibrationStatus>('initial');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [recordingPermissionStatus, setRecordingPermissionStatus] = useState(false);
  const runRef = useRef(0);
  const leaseRef = useRef<MicLease | null>(null);

  const run = useCallback(() => {
    const gen = ++runRef.current;
    setStatus('checking');
    setErrorMessage(null);
    setLevel(0);

    let stage: 'quiet' | 'level' | 'done' = 'quiet';
    let ambientSum = 0;
    let ambientCount = 0;
    let ambientFloor = 0;
    let peakLevel = 0;
    const startedAt = Date.now();

    acquireMic({
      onFrame: (frame) => {
        if (gen !== runRef.current || stage === 'done') return;
        const elapsed = Date.now() - startedAt;

        if (stage === 'quiet') {
          ambientSum += frame.rms;
          ambientCount++;
          if (elapsed < QUIET_STAGE_MS) return;
          ambientFloor = ambientCount ? ambientSum / ambientCount : 0;
          if (ambientFloor > NOISY_FLOOR_RMS) {
            stage = 'done';
            setStatus('too-noisy');
            void leaseRef.current?.release();
            return;
          }
          stage = 'level';
          setStatus('listen-level');
          micActive.value = true;
          return;
        }

        // stage === 'level'
        peakLevel = Math.max(peakLevel, frame.rms);
        micRms.value = frame.rms;
        setLevel(Math.min(1, peakLevel / (ABS_MIN_LEVEL_RMS * MIN_LEVEL_MARGIN)));
        if (elapsed < QUIET_STAGE_MS + LEVEL_STAGE_MS) return;
        stage = 'done';
        micActive.value = false;
        micRms.value = 0;
        void leaseRef.current?.release();
        setStatus(peakLevel < Math.max(ABS_MIN_LEVEL_RMS, ambientFloor * MIN_LEVEL_MARGIN) ? 'too-quiet' : 'ok');
      },
    })
      .then((lease) => {
        if (gen !== runRef.current) {
          void lease.release();
          return;
        }
        leaseRef.current = lease;
        setStatus('listen-quiet');
      })
      .catch((err: unknown) => {
        if (gen !== runRef.current) return;
        setStatus(err instanceof MicPermissionError ? 'permission-denied' : 'error');
        setErrorMessage(err instanceof Error ? err.message : 'Could not access the microphone');
      });
  }, []);

  const checkPermissions = async () => {
    let recordingPermissions = await AudioManager.checkRecordingPermissions()
    if (recordingPermissions !== 'Granted') {
      recordingPermissions = await AudioManager.requestRecordingPermissions()
      setRecordingPermissionStatus(recordingPermissions === 'Granted');
    }
  };

  useEffect(() => {
    if (!recordingPermissionStatus) {
      void checkPermissions().then(() => {
        setTimeout(() => {
          run()
        }, 1500);
      });
    } else {
      run();
    }
    return () => {
      runRef.current++;
      void leaseRef.current?.release();
      leaseRef.current = null;
      micActive.value = false;
      micRms.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, errorMessage, level, retry: run };
}
