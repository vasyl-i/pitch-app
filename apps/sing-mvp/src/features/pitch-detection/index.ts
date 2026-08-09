/**
 * Public API of the pitch-detection feature — the app's audio *input*
 * foundation. Features compose these primitives; the DSP internals (YIN,
 * decimation, the recorder) stay private to the slice.
 *
 * Listening features should acquire the mic through `acquireMic` rather than
 * constructing an engine, so the single-recorder invariant holds — and so the
 * reference-audio interlock (see `lib/referenceGate`) applies to every one of
 * them. Frames that could contain the app's own playback never reach a
 * feature's `onFrame`.
 */
export { acquireMic, releaseMic, MicPermissionError } from './lib/micBroker';
export type { MicLease, PitchFrame, PitchEngineOptions } from './lib/micBroker';

/**
 * Frame-conditioning primitives.
 *
 * `createPitchSmoother` is deliberately **not** exported here. Smoothing pitch
 * before scoring was measured as the largest source of user-visible error on
 * real singing (20.11% of frames mis-coloured against 3.78% raw), so it now
 * lives in `lib/experimental/pitchSmoother` as a benchmark comparison arm only.
 * Features wanting visual stability should use the note stabilizer in
 * `features/pitch-visualization`, which leaves every pitch value untouched.
 * See docs/PITCH_SMOOTHER_ANALYSIS.md.
 */
export {
  createVoiceGate,
  createThrottle,
  createSustainTracker,
  createStabilityTracker,
  createVibratoDetector,
} from './lib/signal';
export type { VoiceGate, SustainTracker, StabilityTracker, VibratoDetector, VibratoState } from './lib/signal';

/**
 * The detector's measured operating range and its confidence vocabulary.
 * Features that record durable facts about a singer (vocal range above all)
 * should check `isReliableF0` before trusting a detection — outside the band
 * the failure mode is a silent octave error, not a missing reading. See
 * docs/PITCH_ENGINE_AUDIT.md §3.
 */
export {
  MIN_RELIABLE_F0,
  MAX_RELIABLE_F0,
  isReliableF0,
  CLARITY_CLEAN,
  CLARITY_MIN_RELIABLE,
} from './lib/yin';

/**
 * Developer-only frame diagnostics. Every entry point folds away in release
 * builds — see `lib/diagnostics` for how that is guaranteed.
 */
export {
  DIAGNOSTICS_AVAILABLE,
  enableDiagnostics,
  disableDiagnostics,
  isDiagnosticsEnabled,
  annotateLatestFrame,
  diagnosticFrames,
  diagnosticsSummary,
  diagnosticsToCsv,
} from './lib/diagnostics';
export type { DiagnosticFrame, DiagnosticsSummary } from './lib/diagnostics';
