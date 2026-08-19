/**
 * Guided vocal-range measurement: mic calibration, the low/high detection
 * engine, and the UI for both. The measured profile itself lives in
 * `@/entities/profile` — this feature is the detection flow.
 */
export { useMicCalibration } from './lib/calibration';
export type { CalibrationState, CalibrationStatus } from './lib/calibration';
export { useGuidedRangeDetection, LOW_CONFIDENCE_THRESHOLD } from './lib/guidedDetection';
export type { GuidedDetectionState, GuidedStatus, RangeDirection } from './lib/guidedDetection';

export { MicCalibrationGate } from './ui/MicCalibrationGate';
export { DetectionFlow } from './ui/DetectionFlow';
export type { DetectionResult } from './ui/DetectionFlow';
export { ResultsCard } from './ui/ResultsCard';
export { RangeBar } from './ui/RangeBar';
export { RangeSuggestionBanner } from './ui/RangeSuggestionBanner';
