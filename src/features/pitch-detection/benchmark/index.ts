/**
 * Pitch-detection benchmark harness.
 *
 * Development tooling, not app code: nothing under `src/` imports this, so it
 * never reaches a bundle. Run it with `npm run benchmark`.
 *
 * The point of the harness is to make claims about the detector checkable.
 * Before it existed, "more accurate" and "feels laggy" were the available
 * vocabulary, and the audit's numbers lived in a document that no longer had to
 * agree with the code. Now every number has a corpus, a configuration and a
 * band attached, and a committed baseline that a change has to move on purpose.
 */
export * from './types';
export * from './bands';
export * from './budgets';
export * from './corpus';
export * from './decimate';
export * from './detectors';
export * from './metrics';
export * from './realCorpus';
export * from './report';
export * from './runner';
export * from './signals';
export * from './wav';

// `realCorpusLoader` is deliberately NOT re-exported: it is the only module
// here that imports `node:fs`, and keeping it off the barrel means everything
// else stays runnable in Hermes for a future on-device benchmark.
