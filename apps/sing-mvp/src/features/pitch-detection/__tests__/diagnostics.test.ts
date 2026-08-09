/**
 * Diagnostics behaviour and, more importantly, its *inertness*.
 *
 * `DIAGNOSTICS_AVAILABLE` is computed at module load from `__DEV__`, so the
 * module is imported dynamically here after the global is set — a static
 * import would be hoisted above the assignment and the dev path would never
 * be exercised.
 *
 * The production guarantee has two halves. The half that can be tested is
 * runtime: nothing is recorded unless someone explicitly enabled collection.
 * The other half is build-time — Metro replaces `__DEV__` with `false` and the
 * minifier drops every guarded block, including the call sites — which is a
 * bundler behaviour, not something a unit test can observe.
 */
import assert from 'node:assert/strict';
import { before, test } from 'node:test';

type DiagnosticsModule = typeof import('../lib/diagnostics');
let diag: DiagnosticsModule;

before(async () => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  diag = await import('../lib/diagnostics');
});

const frame = (over: Partial<import('../lib/diagnostics').DiagnosticFrame> = {}) => ({
  timestamp: 1000,
  audioTime: 1,
  rawFrequency: 220,
  confidence: 0.99,
  rms: 0.1,
  clipped: false,
  processingMs: 0.5,
  latencyMs: null,
  ...over,
});

test('collects nothing until explicitly enabled', () => {
  assert.equal(diag.DIAGNOSTICS_AVAILABLE, true, 'dev build should permit diagnostics');
  assert.equal(diag.isDiagnosticsEnabled(), false, 'must be off by default');

  assert.equal(diag.recordFrame(frame()), null);
  assert.deepEqual(diag.diagnosticFrames(), []);
  assert.equal(diag.diagnosticsSummary(), null);
  assert.equal(diag.diagnosticsToCsv(), '');
});

test('records frames in capture order once enabled', () => {
  diag.enableDiagnostics();
  for (let i = 0; i < 5; i++) diag.recordFrame(frame({ timestamp: 1000 + i, rawFrequency: 220 + i }));

  const frames = diag.diagnosticFrames();
  assert.equal(frames.length, 5);
  assert.deepEqual(frames.map((f) => f.rawFrequency), [220, 221, 222, 223, 224]);
  diag.disableDiagnostics();
});

test('the consuming feature can annotate the frame it just handled', () => {
  diag.enableDiagnostics();
  diag.recordFrame(frame());
  diag.annotateLatestFrame({ voiced: true, filteredMidi: 57.2, cents: -8, source: 'test' });

  const [only] = diag.diagnosticFrames();
  assert.equal(only.voiced, true);
  assert.equal(only.filteredMidi, 57.2);
  assert.equal(only.cents, -8);
  assert.equal(only.source, 'test');
  diag.disableDiagnostics();
});

test('annotating with no recorded frame is a no-op, not a crash', () => {
  diag.enableDiagnostics();
  assert.doesNotThrow(() => diag.annotateLatestFrame({ voiced: true }));
  diag.disableDiagnostics();
});

test('summary aggregates cost, voicing and out-of-band detections', () => {
  diag.enableDiagnostics();
  diag.recordFrame(frame({ processingMs: 1, rms: 0.2, rawFrequency: 220 }));
  diag.annotateLatestFrame({ voiced: true });
  diag.recordFrame(frame({ processingMs: 3, rms: 0.4, rawFrequency: 1200 })); // above the reliable band
  diag.annotateLatestFrame({ voiced: false });
  diag.recordFrame(frame({ processingMs: 2, rms: 0.3, rawFrequency: 40 })); // below it

  const s = diag.diagnosticsSummary();
  assert.ok(s);
  assert.equal(s.frames, 3);
  assert.equal(s.voicedFrames, 1);
  assert.equal(s.maxProcessingMs, 3);
  assert.equal(s.meanProcessingMs, 2);
  assert.equal(s.outOfBandFrames, 2, 'both the 1200Hz and 40Hz detections are outside the declared range');
  diag.disableDiagnostics();
});

test('exports CSV with a header and one row per frame', () => {
  diag.enableDiagnostics();
  diag.recordFrame(frame({ rawFrequency: 220 }));
  diag.annotateLatestFrame({ voiced: true, filteredMidi: 57, cents: 3, source: 'test' });

  const lines = diag.diagnosticsToCsv().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^timestamp,audioTime,rawFrequency,/);
  assert.match(lines[1], /220/);
  assert.match(lines[1], /test$/);
  diag.disableDiagnostics();
});

test('disabling clears the buffer, so a session cannot leak into the next', () => {
  diag.enableDiagnostics();
  diag.recordFrame(frame());
  assert.equal(diag.diagnosticFrames().length, 1);

  diag.disableDiagnostics();
  assert.equal(diag.isDiagnosticsEnabled(), false);
  assert.deepEqual(diag.diagnosticFrames(), []);

  diag.enableDiagnostics();
  assert.deepEqual(diag.diagnosticFrames(), [], 'a fresh session starts empty');
  diag.disableDiagnostics();
});

test('the ring is bounded — a long session cannot grow without limit', () => {
  diag.enableDiagnostics();
  // 3200 > RING_CAPACITY (3000): the oldest frames must be evicted
  for (let i = 0; i < 3200; i++) diag.recordFrame(frame({ timestamp: i, rawFrequency: 100 + (i % 500) }));

  const frames = diag.diagnosticFrames();
  assert.equal(frames.length, 3000, 'buffer must cap at capacity');
  assert.equal(frames[0].timestamp, 200, 'oldest retained frame should be the 201st written');
  assert.equal(frames[frames.length - 1].timestamp, 3199, 'newest frame must be last');

  const s = diag.diagnosticsSummary();
  assert.ok(s && s.droppedFromRing > 0, 'eviction should be reported');
  diag.disableDiagnostics();
});
