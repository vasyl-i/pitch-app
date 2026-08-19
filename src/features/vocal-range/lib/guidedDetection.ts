/**
 * Guided single-direction range detection: slide down for the lowest note,
 * slide up for the highest. Both directions share this engine because the
 * requirements are identical except which way "better" points — continuous
 * detection, reject unstable pitch (which is what catches vocal fry: its
 * irregular glottal pulses show up as low clarity / high jitter, so there's
 * no separate frequency-band special case for it), reject clipped audio
 * (screams, popped consonants), require ~600ms of genuine sustain before a
 * note counts, and never auto-advance past a low-confidence result.
 *
 * A transient spike that never gets sustained — an accidental falsetto
 * break, a cough — simply never clears the sustain tracker, so it can't
 * contaminate the detected extreme.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  acquireMic,
  CLARITY_MIN_RELIABLE,
  createStabilityTracker,
  createSustainTracker,
  createThrottle,
  createVoiceGate,
  isReliableF0,
  MicPermissionError,
  type MicLease,
} from '@/features/pitch-detection';
import { freqToMidi } from '@/shared/lib/music';
import { micActive, micRms } from '@/shared/lib/micRmsBus';

export type RangeDirection = 'low' | 'high';

export type GuidedStatus = 'idle' | 'listening' | 'error' | 'interrupted';

/** how long a pitch must be held, stable and confident, before it counts */
const SUSTAIN_MS = 600;
const SAME_NOTE_SEMITONES = 0.8;
/** rolling pitch jitter above this reads as unstable (catches fry, strain, breaks) */
const JITTER_LIMIT_CENTS = 25;
/**
 * YIN periodicity below this isn't trustworthy enough to accept.
 *
 * Was a local 0.35, which measurement showed to be a no-op: every frame that
 * yields a frequency at all scores ≥0.73, so the check never rejected
 * anything. Now the shared, measured band — it rejects the "very breathy"
 * class (~0.73) while keeping ordinary breathy singing (~0.91). See
 * docs/PITCH_ENGINE_AUDIT.md §3 F1.
 */
const CLARITY_MIN = CLARITY_MIN_RELIABLE;
/** a captured extreme below this confidence gets a "try that again" nudge, not a block */
export const LOW_CONFIDENCE_THRESHOLD = 0.45;

const UI_TICK_MS = 60;
const SILENT_UI_MS = 100;
/** how long "Nice." / "Great." stays on screen after a new extreme is accepted */
const ACCEPT_MESSAGE_MS = 1400;

export interface GuidedDetectionState {
  status: GuidedStatus;
  errorMessage: string | null;
  /** live pitch, null while silent */
  currentMidi: number | null;
  currentFrequency: number | null;
  /** 0..1, this instant's periodicity confidence */
  liveConfidence: number;
  /** 0..1 toward the sustain requirement for the note currently being held */
  holdProgress: number;
  /** the best (lowest/highest) accepted note this attempt, across retries within this mount */
  bestMidi: number | null;
  bestConfidence: number;
  /** encouraging, context-aware copy */
  message: string;
  start: () => void;
  stop: () => void;
  /** clears the captured best note so the singer can try the phase again */
  retry: () => void;
}

const START_MESSAGE: Record<RangeDirection, string> = {
  low: 'Start on a comfortable note and slowly slide lower.',
  high: 'Slowly slide upward until it stops feeling comfortable.',
};
const KEEP_GOING_MESSAGE: Record<RangeDirection, string> = {
  low: 'Go a little lower, or continue when you’re done.',
  high: 'Go a little higher, or continue when you’re done.',
};

export function useGuidedRangeDetection(direction: RangeDirection): GuidedDetectionState {
  const [status, setStatus] = useState<GuidedStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentMidi, setCurrentMidi] = useState<number | null>(null);
  const [currentFrequency, setCurrentFrequency] = useState<number | null>(null);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [bestMidi, setBestMidi] = useState<number | null>(null);
  const [bestConfidence, setBestConfidence] = useState(0);
  const [acceptedMessage, setAcceptedMessage] = useState<string | null>(null);

  const leaseRef = useRef<MicLease | null>(null);
  const runRef = useRef(0);
  const acceptCountRef = useRef(0);
  const acceptedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gateRef = useRef(createVoiceGate());
  const stabilityRef = useRef(createStabilityTracker());
  const sustainRef = useRef(createSustainTracker(SUSTAIN_MS, SAME_NOTE_SEMITONES));
  const clarityEmaRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);

  const clearAcceptedTimer = () => {
    if (acceptedTimerRef.current) clearTimeout(acceptedTimerRef.current);
    acceptedTimerRef.current = null;
  };

  const stop = useCallback(() => {
    runRef.current++;
    void leaseRef.current?.release();
    leaseRef.current = null;
    gateRef.current.reset();
    stabilityRef.current.reset();
    sustainRef.current.reset();
    holdStartRef.current = null;
    clearAcceptedTimer();
    setStatus('idle');
    setCurrentMidi(null);
    setCurrentFrequency(null);
    setLiveConfidence(0);
    setHoldProgress(0);
    micRms.value = 0;
    micActive.value = false;
  }, []);

  const start = useCallback(() => {
    if (leaseRef.current) return;
    setErrorMessage(null);

    const run = ++runRef.current;
    const uiTick = createThrottle(UI_TICK_MS);

    setStatus('listening');
    micActive.value = true;
    acquireMic({
      iosMode: 'measurement',
      onInterruption: (phase) => {
        if (run !== runRef.current) return;
        setStatus(phase === 'began' ? 'interrupted' : 'listening');
      },
      onFrame: (frame) => {
        const now = Date.now();
        const rawMidi = frame.frequency ? freqToMidi(frame.frequency) : null;
        const isVoice = !frame.clipped && gateRef.current.accept(frame.rms, rawMidi, now);

        if (rawMidi === null || !isVoice) {
          stabilityRef.current.reset();
          sustainRef.current.reset();
          holdStartRef.current = null;
          if (uiTick(now, SILENT_UI_MS)) {
            setCurrentMidi(null);
            setCurrentFrequency(null);
            setLiveConfidence(0);
            setHoldProgress(0);
          }
          micRms.value = frame.rms;
          return;
        }

        gateRef.current.confirm(rawMidi, now);
        clarityEmaRef.current = clarityEmaRef.current * 0.7 + frame.clarity * 0.3;

        // Stability, sustain and the recorded range all read the *raw* detector
        // pitch. A pitch smoother used to sit here; it fed both these
        // measurements and the readout, which made a presentation filter part of
        // what got written durably to the user's profile.
        const jitter = stabilityRef.current.push(rawMidi, now);
        // Outside the detector's measured band the failure mode is a *silent
        // octave error*, not a missing reading (see MAX_RELIABLE_F0): a
        // soprano's C6 comes back as C5. Range is the one measurement written
        // durably to the profile and used to transpose every later exercise,
        // so an unverifiable extreme is refused rather than recorded. She
        // still keeps the highest note that *was* verifiable — an honest
        // semitone short beats a confident octave wrong.
        const reliable = frame.frequency !== null && isReliableF0(frame.frequency);
        const stable =
          (jitter === null || jitter <= JITTER_LIMIT_CENTS) && frame.clarity >= CLARITY_MIN && reliable;

        let held: number | null = null;
        if (stable) {
          held = sustainRef.current.push(rawMidi, now);
          if (holdStartRef.current === null) holdStartRef.current = now;
        } else {
          sustainRef.current.reset();
          holdStartRef.current = null;
        }

        if (held !== null) {
          setBestMidi((prevMidi) => {
            const improves = prevMidi === null || (direction === 'low' ? held! < prevMidi : held! > prevMidi);
            if (improves) {
              setBestConfidence(clarityEmaRef.current);
              acceptCountRef.current += 1;
              setAcceptedMessage(acceptCountRef.current === 1 ? 'Nice.' : 'Great.');
              clearAcceptedTimer();
              acceptedTimerRef.current = setTimeout(() => setAcceptedMessage(null), ACCEPT_MESSAGE_MS);
            }
            return improves ? held! : prevMidi;
          });
        }

        if (uiTick(now)) {
          setCurrentMidi(rawMidi);
          setCurrentFrequency(frame.frequency);
          setLiveConfidence(stable ? frame.clarity : frame.clarity * 0.5);
          micRms.value = frame.rms;
          const elapsed = holdStartRef.current === null ? 0 : now - holdStartRef.current;
          setHoldProgress(stable ? Math.min(1, elapsed / SUSTAIN_MS) : 0);
        }
      },
    })
      .then((lease) => {
        if (run !== runRef.current) {
          void lease.release();
          return;
        }
        leaseRef.current = lease;
      })
      .catch((err: unknown) => {
        if (run !== runRef.current) return;
        leaseRef.current = null;
        setStatus('error');
        setErrorMessage(
          err instanceof MicPermissionError
            ? 'Microphone access is required. Enable it in Settings and try again.'
            : err instanceof Error
              ? err.message
              : 'Could not start listening'
        );
      });
  }, [direction]);

  const retry = useCallback(() => {
    setBestMidi(null);
    setBestConfidence(0);
    acceptCountRef.current = 0;
    clearAcceptedTimer();
    setAcceptedMessage(null);
  }, []);

  // pause cleanly when the app is backgrounded (incoming call, home button);
  // the singer resumes by pressing start() again, same as any other retry
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active' && leaseRef.current) stop();
    });
    return () => sub.remove();
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  const message = (() => {
    if (status === 'error') return errorMessage ?? 'Something went wrong.';
    if (status === 'interrupted') return 'Paused for a moment — resuming…';
    if (acceptedMessage) return acceptedMessage;
    if (currentMidi === null) return bestMidi === null ? START_MESSAGE[direction] : KEEP_GOING_MESSAGE[direction];
    if (liveConfidence < CLARITY_MIN) return 'Hold the note — let it settle.';
    if (holdProgress < 1) return 'Hold the note…';
    return KEEP_GOING_MESSAGE[direction];
  })();

  return {
    status,
    errorMessage,
    currentMidi,
    currentFrequency,
    liveConfidence,
    holdProgress,
    bestMidi,
    bestConfidence,
    message,
    start,
    stop,
    retry,
  };
}
