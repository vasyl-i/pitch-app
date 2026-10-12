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
import { hapticMicReady } from '@/shared/audio';
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

const QUIET_STAGE_MS = 2000;
/**
 * Upper bound for the "hum a note" stage. The stage ends as soon as the voice
 * is heard, so this only matters for people who need a moment to start —
 * reading the prompt and taking a breath easily eats the first second.
 */
const LEVEL_STAGE_MS = 3500;
/** ambient rms above this reads as a noisy room, not just quiet electronics hiss */
const NOISY_FLOOR_RMS = 0.02;
/**
 * Loudness pass: the level stage must clear the ambient floor by this
 * multiple, and never sit below the absolute minimum. Kept just above the
 * detector's own voice gate (`signal.ts`: max(0.004, floor × 1.7)) — the check
 * exists to catch a muted or blocked mic, not to demand more volume than
 * detection needs. Soft, high voices (kids especially) hum well under 0.01.
 */
const MIN_LEVEL_MARGIN = 2;
const ABS_MIN_LEVEL_RMS = 0.005;
/**
 * Pitch pass: this many frames (~12ms each, so ≈170ms) where the detector
 * found a pitch above its voice gate prove the voice is usable even if the
 * loudness pass hasn't fired.
 */
const VOICED_FRAMES_TO_PASS = 15;
const VOICE_GATE_ABS_RMS = 0.004;
const VOICE_GATE_FLOOR_MULT = 1.7;

export interface CalibrationState {
  status: CalibrationStatus;
  errorMessage: string | null;
  /** 0..1 meter for the "make a sound" stage, so the UI can show a live level bar */
  level: number;
  retry: () => void;
}

export function useMicCalibration(opts?: { skip?: boolean }): CalibrationState {
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
    let levelThreshold = ABS_MIN_LEVEL_RMS;
    let voiceGate = VOICE_GATE_ABS_RMS;
    let voicedFrames = 0;
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
          levelThreshold = Math.max(ABS_MIN_LEVEL_RMS, ambientFloor * MIN_LEVEL_MARGIN);
          voiceGate = Math.max(VOICE_GATE_ABS_RMS, ambientFloor * VOICE_GATE_FLOOR_MULT);
          stage = 'level';
          setStatus('listen-level');
          micActive.value = true;
          hapticMicReady();
          return;
        }

        // stage === 'level'
        peakLevel = Math.max(peakLevel, frame.rms);
        if (frame.frequency != null && frame.rms > voiceGate) voicedFrames++;
        micRms.value = frame.rms;
        // full bar == loud enough to pass
        setLevel(Math.min(1, peakLevel / levelThreshold));
        const heard = peakLevel >= levelThreshold || voicedFrames >= VOICED_FRAMES_TO_PASS;
        if (!heard && elapsed < QUIET_STAGE_MS + LEVEL_STAGE_MS) return;
        stage = 'done';
        micActive.value = false;
        micRms.value = 0;
        void leaseRef.current?.release();
        setStatus(heard ? 'ok' : 'too-quiet');
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
    if (opts?.skip) return;
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
