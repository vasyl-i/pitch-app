/** The singer's profile: measured vocal range and the preferences derived from it. */
export { useProfileStore } from './model/profileStore';
export type { VocalProfile, TemporaryAdjustment } from './model/profileStore';
export { voiceType, rangeSemitones, promptRange, DEFAULT_PROMPT_RANGE } from './lib/range';
export { deriveComfortRange } from './lib/comfort';
export {
  recordObservedNote,
  evaluateRangeSuggestion,
  dismissRangeSuggestion,
  useRangeObservationStore,
} from './lib/rangeLearning';
export type { RangeSuggestion } from './lib/rangeLearning';
