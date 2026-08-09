/**
 * Exclusive, serialized ownership of the one microphone.
 *
 * The device has a single recorder and a single audio session, but three
 * features want to listen (staff practice, ear training, range detection) and
 * two of them live on tab screens that stay mounted after you navigate away.
 * Previously each feature constructed its own `PitchEngine` and hoped the
 * others had cleaned up — the ear-training screen carries a hand-rolled `blur`
 * listener that exists purely to dodge that collision, and nothing prevented a
 * half-finished `start()` racing a `stop()`.
 *
 * This broker makes the invariant explicit: at most one lease is live at a
 * time, acquiring releases the incumbent, and every start/stop is serialized
 * through one promise chain so the recorder is never mid-transition when the
 * next call arrives. A released lease stops delivering frames immediately,
 * even if its engine is still winding down.
 */
import { createPitchEngine, MicPermissionError, type PitchEngineOptions, type PitchFrame } from './pitchEngine';
import { referenceContaminates } from './referenceGate';

export interface MicLease {
  /** stop delivering frames and release the hardware */
  release(): Promise<void>;
  /** false once released (or pre-empted by a later acquirer) */
  readonly active: boolean;
}

interface LeaseRecord {
  onFrame: (frame: PitchFrame) => void;
  engine: ReturnType<typeof createPitchEngine>;
  active: boolean;
  released: boolean;
}

let current: LeaseRecord | null = null;
/** serializes every hardware transition; never rejects, so the chain survives errors */
let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(op: () => Promise<T>): Promise<T> {
  const run = chain.then(op, op);
  chain = run.catch(() => {});
  return run;
}

async function releaseRecord(record: LeaseRecord): Promise<void> {
  // A record is torn down exactly once. It is normal for two paths to ask:
  // `acquireMic` pre-empts the incumbent, and the incumbent's owner later
  // releases the lease it still holds a reference to. Tearing the same engine
  // down twice would stop hardware the *successor* now owns.
  if (record.released) return;
  record.released = true;
  record.active = false;
  if (current === record) current = null;
  await record.engine.stop().catch(() => {
    // teardown failures are not actionable; the next acquire starts fresh
  });
}

export interface AcquireMicOptions extends PitchEngineOptions {
  onFrame: (frame: PitchFrame) => void;
}

export type { PitchEngineOptions };

/**
 * Take exclusive hold of the mic. Resolves once frames are flowing; rejects
 * (leaving no lease behind) if permission is denied or the recorder fails.
 */
export function acquireMic({ onFrame, ...engineOptions }: AcquireMicOptions): Promise<MicLease> {
  return serialize(async () => {
    if (current) await releaseRecord(current);

    const record: LeaseRecord = {
      onFrame,
      active: true,
      released: false,
      engine: createPitchEngine((frame) => {
        // a pre-empted lease must go quiet at once, even mid-teardown
        if (!record.active) return;
        // Hard interlock, enforced here because this is the single point every
        // listening feature goes through: a frame captured while the app was
        // sounding reference audio may *be* that audio, so it says nothing
        // about the singer. It is dropped outright rather than forwarded as a
        // synthetic silent frame — a fake zero-RMS frame would drag the voice
        // gate's noise-floor estimate down just as wrongly as the bleed would
        // drag it up.
        if (referenceContaminates()) return;
        record.onFrame(frame);
      }, engineOptions),
    };

    try {
      await record.engine.start();
    } catch (err) {
      record.active = false;
      throw err;
    }

    current = record;

    return {
      get active() {
        return record.active;
      },
      release: () => serialize(() => releaseRecord(record)),
    };
  });
}

/** Release whatever holds the mic, if anything. Safe to call when idle. */
export function releaseMic(): Promise<void> {
  return serialize(async () => {
    if (current) await releaseRecord(current);
  });
}

export { MicPermissionError };
export type { PitchFrame };
