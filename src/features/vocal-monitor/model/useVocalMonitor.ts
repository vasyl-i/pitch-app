import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  acquireMic,
  createPitchJumpGuard,
  createStabilityTracker,
  createThrottle,
  createVoiceGate,
  MicPermissionError,
  type MicLease,
} from '@/features/pitch-detection';
import { usePitchTrail } from '@/features/pitch-visualization';
import { freqToMidi } from '@/shared/lib/music';
import { micActive, micRms } from '@/shared/lib/micRmsBus';
import { hapticMicReady } from '@/shared/audio';
import { t } from '@/shared/i18n';
import { accuracyScore, centsFromNearestNote, createRollingMean, stabilityScore } from '../lib/monitorMetrics';
import { clearLive, publishLive } from './liveMonitor';

export type MonitorStatus = 'idle' | 'listening' | 'interrupted' | 'error';

/** seconds of tail kept, and shown across the canvas */
export const VISIBLE_SECONDS = 6;
/** the trail flushes often so the tail's end stays glued to the dot */
const TRAIL_FLUSH_MS = 50;
const METRICS_TICK_MS = 200;
/** accuracy is the mean over this much recent singing */
const ACCURACY_WINDOW_MS = 4000;
/** this long without a voiced frame and both readouts return to their empty state (a breath between words doesn't) */
const SILENCE_RESET_MS = 800;
/** while the jump guard holds a frame back the dot stays put, but not for longer than this */
const DOT_HOLD_MS = 120;

export interface MonitorMetrics {
  /** 0–100, null until something has been sung */
  accuracy: number | null;
  /** 0–100, null until a note has been held long enough to measure */
  stability: number | null;
}

const NO_METRICS: MonitorMetrics = { accuracy: null, stability: null };

/**
 * A sandbox listening session: takes the mic, turns every voiced frame into a
 * live dot, a tail sample and two rolling readouts. Nothing is graded against
 * a target, saved, or sent anywhere — the audio stays on the device.
 */
export function useVocalMonitor() {
  const [status, setStatus] = useState<MonitorStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MonitorMetrics>(NO_METRICS);
  const { trail, now, push, reset: resetTrail } = usePitchTrail(VISIBLE_SECONDS, TRAIL_FLUSH_MS);

  const leaseRef = useRef<MicLease | null>(null);
  const runRef = useRef(0);
  const pushRef = useRef(push);
  pushRef.current = push;

  const stop = useCallback(() => {
    runRef.current++;
    void leaseRef.current?.release();
    leaseRef.current = null;
    clearLive();
    micRms.value = 0;
    micActive.value = false;
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    if (leaseRef.current) return;
    const run = ++runRef.current;
    setErrorMessage(null);
    setMetrics(NO_METRICS);
    resetTrail();

    const gate = createVoiceGate();
    const jumpGuard = createPitchJumpGuard();
    const stability = createStabilityTracker();
    const accuracy = createRollingMean(ACCURACY_WINDOW_MS);
    const metricsTick = createThrottle(METRICS_TICK_MS);
    let shownNote: number | null = null;
    let lastStability: number | null = null;
    let lastVoicedAt = 0;

    setStatus('listening');
    micActive.value = true;
    hapticMicReady();
    acquireMic({
      iosMode: 'measurement',
      onInterruption: (phase) => {
        if (run === runRef.current) setStatus(phase === 'began' ? 'interrupted' : 'listening');
      },
      onFrame: (frame) => {
        const at = Date.now();
        const rawMidi = frame.frequency ? freqToMidi(frame.frequency) : null;
        const voiced = rawMidi !== null && !frame.clipped && gate.accept(frame.rms, rawMidi, at);
        // every voiced frame keeps the gate's continuity, held or not — as the
        // native gate does — so a soft note stays on the lower sustain bar
        // while the guard is still deciding about it
        if (voiced) gate.confirm(rawMidi, at);
        // a voiced frame still has to be a plausible continuation of the line
        // to be shown; the guard may hold it back, drop it, or release a
        // confirmed jump together with the frames it held
        const released = jumpGuard.push(voiced ? rawMidi : null, at);

        for (const { midi, at: sungAt } of released) {
          const cents = centsFromNearestNote(midi);
          const note = publishLive(midi, cents);
          // a new note starts a new stability window: moving between notes is not a wobble
          if (note !== shownNote) {
            shownNote = note;
            stability.reset();
          }
          const stdev = stability.push(midi, sungAt);
          if (stdev !== null) lastStability = stabilityScore(stdev);
          accuracy.push(accuracyScore(cents), sungAt);
          lastVoicedAt = sungAt;
          pushRef.current(midi, cents, sungAt);
        }
        if (!released.length) {
          if (!voiced || at - lastVoicedAt > DOT_HOLD_MS) {
            publishLive(null, null);
            shownNote = null;
            stability.reset();
          }
          pushRef.current(null);
        }
        micRms.value = frame.rms;

        if (metricsTick(at)) {
          if (at - lastVoicedAt > SILENCE_RESET_MS) {
            // silence: forget what was heard, so the next sound starts from scratch
            accuracy.reset();
            lastStability = null;
          }
          const mean = accuracy.mean(at);
          const next: MonitorMetrics = { accuracy: mean === null ? null : Math.round(mean), stability: mean === null ? null : lastStability };
          setMetrics((prev) => (prev.accuracy === next.accuracy && prev.stability === next.stability ? prev : next));
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
        micActive.value = false;
        setStatus('error');
        setErrorMessage(
          err instanceof MicPermissionError ? t('vocalRange.mic.required') : err instanceof Error ? err.message : t('vocalMonitor.couldNotStart'),
        );
      });
  }, [resetTrail]);

  // a call or the home button: release the mic, and pick up again on return
  useEffect(() => {
    let resume = false;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && leaseRef.current) {
        resume = true;
        stop();
      } else if (next === 'active' && resume) {
        resume = false;
        start();
      }
    });
    return () => sub.remove();
  }, [stop, start]);

  useEffect(() => () => stop(), [stop]);

  return { status, errorMessage, metrics, trail, now, start, stop };
}
