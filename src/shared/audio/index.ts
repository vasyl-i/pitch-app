/** Shared audio output: one context, one oscillator voice scheduler. */
export { audioContext, audioNow, createToneGroup } from './toneBus';
export type { ToneGroup, ToneGroupOptions, ToneSpec } from './toneBus';

/** What the app is currently sounding — the mic pipeline's interlock reads this. */
export { isReferenceAudible, referenceAudibleThrough } from './referenceMonitor';

/** User sound preferences (volume, waveform). */
export { useSoundStore, SOUND_TYPE_LABELS } from './soundStore';
export type { SoundType } from './soundStore';

/** Piano sampler (Salamander Grand Piano). */
export { preloadPianoSamples } from './pianoSampler';

/** Where the sound is going — decides whether the interlock is needed at all. */
export { isPrivateOutput } from './outputRoute';
export { outputIsPrivate, watchOutputRoute } from './routeWatcher';
