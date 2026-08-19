# Performance Analysis Engine — MVP Specification

Status: specification, 2026-08-03. **Nothing implemented. No DSP change proposed.**
Scope: the layer between the pitch detector and the UI that turns pitch
measurements into musical feedback, and the layer that turns repeated sessions
into recurring patterns.

Companions: [PITCH_BENCHMARK.md](PITCH_BENCHMARK.md),
[REAL_WORLD_BASELINE.md](REAL_WORLD_BASELINE.md),
[PITCH_SMOOTHER_ANALYSIS.md](PITCH_SMOOTHER_ANALYSIS.md).

---

## 0. The one decision that shapes everything

**In the product's primary flow there is no reference melody.**

The vision is: upload an instrumental → detect the key → sing → analyse. Nothing
in that chain tells the engine what the singer *intended* to sing. There is no
score, no target note, no expected onset. The only reference is harmonic: a key,
and eventually a chord timeline.

The app's other flow — staff-practice exercises — does have a reference melody
(`entities/exercise`'s `TargetNote[]`), and there every performed note has an
intended pitch and an intended time.

These are not variations of one problem. Half the metrics and half the mistake
categories in the brief — late attack, early release, missed note, extra note —
are *undefined* without an intended onset. A specification that pretends they
generalize would be unimplementable for the flow the product is actually built
around.

So the engine takes an explicit **reference model** with two kinds, and every
metric and mistake declares which kinds support it:

| Reference kind | Source | What it provides | Available in |
|---|---|---|---|
| `melody` | `Exercise.notes` | intended pitch **and** intended time per note | staff practice |
| `harmony` | `DetectedKey` (+ chords when analysis provides them) | the set of acceptable pitch classes at a time | instrumental sing |

Under `harmony`, each performed note's reference is derived from the performance
itself — the nearest scale tone to what was actually sung, which is what
`features/instrumental/lib/grade.ts` already does. Timing mistakes do not exist
there, and the engine must not invent them.

### What this engine changes about today's app

- Staff practice already produces `PhraseSummary` and persists a `SessionRecord`;
  the engine generalizes that and adds per-note detail.
- **Instrumental sing today computes a take score and persists nothing.** No
  history, no weak patterns. Closing that is the main product value of this work.

---

## 1. Architecture

```
  microphone
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Pitch Detection (existing, unchanged)                       │
│   PitchFrame { frequency, rms, clarity, clipped, when }     │
└─────────────────────────────────────────────────────────────┘
      │  raw frames — never smoothed (see PITCH_SMOOTHER_ANALYSIS)
      ▼
┌─────────────────────────────────────────────────────────────┐
│ S1  Frame Conditioning            → AnalysisFrame[]         │
│     voicing, reliability, time base. No filtering of pitch.  │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ S2  Musical Event Generation      → PerformedNote[]         │
│     boundaries, attack / sustain / release phases            │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ S3  Musical Interpretation        → InterpretedNote[]       │
│     reference resolution, scale degree, melodic interval,    │
│     phrase grouping, missing / extra notes                   │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ S4  Performance Analysis          → NoteAnalysis[], Mistake[]│
│     per-note metrics and mistake detection                   │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ S5  Session Summary               → SessionReport           │
│     aggregation across notes and phrases                     │
└─────────────────────────────────────────────────────────────┘
      ▼  persisted SessionRecord
┌─────────────────────────────────────────────────────────────┐
│ S6  Multi-Session Analysis        → WeakPattern[]           │
│     recurring patterns across stored sessions                │
└─────────────────────────────────────────────────────────────┘
```

### Responsibilities and boundaries

| Stage | Owns | Must not |
|---|---|---|
| S1 | deciding which frames are the singer, and whether a reading is trustworthy | alter a pitch value |
| S2 | where notes start and end, and their internal phases | know about keys, scales or reference material |
| S3 | what each note *means* musically | compute quality judgements |
| S4 | how well each note was sung | aggregate, or know about other sessions |
| S5 | one session's report | persist, or know about other sessions |
| S6 | patterns across sessions | recommend, coach, or rank exercises |

Three rules hold across all of them:

1. **Pure and deterministic.** Same frames plus same reference model plus same
   configuration produces the same output, always. No clock reads, no randomness,
   no I/O. Time arrives as data on the frames.
2. **No UI dependency.** No React, no React Native, no store imports. The engine
   must run under `node --test` exactly as `features/learning`'s pure services
   already do.
3. **Raw pitch throughout.** S1–S4 consume the detector's unmodified output. The
   note-name hysteresis in `shared/lib/noteStabilizer` is presentation-only and
   is never in this path.

### Where it lives

`src/features/performance-analysis/` — a feature slice with `lib/` (pure stages),
`model/` (types and the session store binding). It depends on
`shared/lib/music`, `entities/exercise` (for `TargetNote`) and
`features/instrumental` (for `DetectedKey`). Nothing depends on it except
screens and the progress store.

---

## 2. Data model

Only entities the MVP needs. Every field has a stated purpose; anything that
cannot be justified from §4–§7 is not here.

### 2.1 Input contract

```ts
/** Re-stated from features/pitch-detection. The engine does not define it. */
interface PitchFrame {
  frequency: number | null;   // Hz, null when unvoiced
  rms: number;                // AC-coupled level of the analysis window
  clarity: number;            // 0..1 periodicity confidence
  clipped: boolean;
  when: number;               // seconds since capture start (audio clock)
}
```

### 2.2 Conditioned frame

```ts
interface AnalysisFrame {
  t: number;              // seconds from session start
  midi: number | null;    // freqToMidi(frequency), null when unvoiced
  voiced: boolean;        // the voice gate's decision
  reliable: boolean;      // isReliableF0(frequency) — see note below
  clarity: number;
  rms: number;
  clipped: boolean;
}
```

`reliable` exists because the detector's failure above `MAX_RELIABLE_F0` is a
*silent octave error*, not a missing reading, and today only vocal-range
detection checks for it. Frames with `reliable === false` are recorded but
excluded from pitch metrics (§4), so a soprano's C6 cannot silently enter a
score as C5.

### 2.3 Reference model

```ts
type ReferenceModel =
  | { kind: 'melody'; notes: ReferenceNote[] }
  | { kind: 'harmony'; key: DetectedKey };

interface ReferenceNote {
  index: number;        // position in the melody, stable across takes
  midi: number;         // intended pitch
  start: number;        // intended onset, seconds from session start
  duration: number;
}
```

`DetectedKey` is the existing `features/instrumental` type, including its
`chords: DetectedChord[]` timeline. The timeline is empty today; §10 covers what
changes when it is not.

### 2.4 Musical events

```ts
interface PerformedNote {
  index: number;          // position in this performance
  startSec: number;       // first voiced frame of the note
  endSec: number;         // last voiced frame
  phases: NotePhases;
  frames: number;         // voiced frames contributing
  gapBeforeSec: number;   // silence since the previous performed note
}

interface NotePhases {
  attack: { fromSec: number; toSec: number };
  sustain: { fromSec: number; toSec: number };
  release: { fromSec: number; toSec: number };
}
```

Phases are spans, not separate note objects: a note is one musical event and
splitting it would break every per-note aggregate.

### 2.5 Interpretation

```ts
interface InterpretedNote {
  performed: PerformedNote;
  /** what this note is measured against */
  target: NoteTarget;
  /** 0–11 relative to the key tonic; null when no key is known */
  scaleDegree: number | null;
  /** signed semitones from the previous interpreted note's target, null if first or after a phrase break */
  intervalFromPrevious: number | null;
  phraseIndex: number;
  /** position within the phrase, 0-based */
  positionInPhrase: number;
}

type NoteTarget =
  | { kind: 'reference'; referenceIndex: number; midi: number }   // melody mode
  | { kind: 'nearest-scale-tone'; midi: number }                  // harmony mode
  | { kind: 'none' };                                             // extra note

interface Phrase {
  index: number;
  startSec: number;
  endSec: number;
  noteIndices: number[];
}
```

### 2.6 Analysis

```ts
interface NoteAnalysis {
  noteIndex: number;
  metrics: NoteMetrics;      // §4
  mistakes: Mistake[];       // §5
  /** false when the note was excluded from pitch metrics (unreliable / too short) */
  scored: boolean;
}

interface Mistake {
  kind: MistakeKind;         // §5
  /** the measurement that produced it, for explainability */
  evidence: { metric: string; value: number; threshold: number };
}
```

`Mistake` carries its evidence because the product's stated differentiator is
explainability: every judgement must be traceable to the number that caused it.

### 2.7 Session

```ts
interface Song {
  id: string;                       // InstrumentalTrack.id, or Exercise.id
  title: string;
  key: string | null;               // e.g. "C major"
  source: 'instrumental' | 'exercise';
}

interface SessionReport {
  song: Song;
  referenceKind: 'melody' | 'harmony';
  startedAt: number;                // epoch ms, supplied by the caller
  durationSec: number;
  notes: InterpretedNote[];
  analyses: NoteAnalysis[];
  phrases: Phrase[];
  summary: SessionSummary;          // §6
}

/** The melodic specialization, for exercise takes. Same object, named for the surface that produces it. */
type ExerciseResult = SessionReport;
```

### 2.8 Persisted and aggregate

```ts
interface SessionRecord { /* §8 */ }

interface WeakPattern {
  kind: WeakPatternKind;      // §7
  /** e.g. "descending minor 3rds", "G4", "scale degree 7" */
  subject: string;
  /** the measured fact, in plain language */
  evidence: string;
  observations: number;
  /** mean signed cents, or the mistake rate, depending on kind */
  magnitude: number;
  firstSeenAt: number;
  lastSeenAt: number;
}
```

---

## 3. Musical event generation (S2)

Behaviour only. No algorithm is prescribed; §10 marks this as the stage most
likely to be replaced.

### 3.1 Note boundaries

A performed note is a maximal run of voiced frames whose pitch stays within a
tolerance band of the run's own centre.

A note **ends** when any of these occurs:

- **Silence.** Unvoiced frames persist longer than `gapSec`. A shorter unvoiced
  patch does not end the note — brief dropouts happen mid-vowel, and the
  real-world baseline measures 2.50% lost-voice frames on clean professional
  singing.
- **Pitch departure.** Pitch moves further than `sameNoteSemitones` from the
  run's running centre and stays there. A momentary excursion does not split a
  note; the departure must persist, or every scoop and every vibrato peak
  becomes a note boundary.
- **End of session.** Whatever is in progress is closed.

A run shorter than `minNoteSec` is **discarded, not emitted**. The existing
instrumental aggregator sets this at 100 ms with a measured justification (a
sixteenth note at 120 bpm is 125 ms) and that reasoning carries over.

**Deliberately not a boundary:** crossing a note-name boundary. A singer sitting
between two notes is singing one note, badly. Splitting there would manufacture
notes out of intonation error — the same rounding failure that the UI note
stabilizer exists to hide, and it must not reappear as musical structure.

### 3.2 Phases

Every note is divided into three spans by time, not by content:

- **Attack** — from onset to `attackSec`, or to 25% of the note, whichever is
  shorter. This is where the singer arrives at the pitch; scooping and
  overshoot live here.
- **Sustain** — the middle. Everything the note "is" for intonation purposes.
- **Release** — the final `releaseSec` or 20% of the note, whichever is shorter.
  Where support fails and pitch sags.

Notes too short to hold all three spans are marked `scored: false` for
phase-dependent metrics but still contribute duration and coverage. A note must
be at least `minPhaseNoteSec` long for attack and release to be measured
separately, or the three spans overlap and report the same frames three times.

### 3.3 Missing notes (melody mode only)

A reference note with no performed note overlapping its window, after alignment
(§3.5), is **missing**. It yields a `NoteAnalysis` with `scored: false` and a
single `missed-note` mistake. It contributes to coverage and to mistake counts,
and to nothing else — a note that was not sung has no intonation.

### 3.4 Extra notes (melody mode only)

A performed note that aligns to no reference note is **extra**. Its target is
`{ kind: 'none' }`. It contributes to mistake counts and to session coverage,
and is excluded from pitch metrics, because there is nothing to measure it
against.

**In harmony mode neither concept exists.** Every performed note is a note the
singer meant to sing, and there is no expected count. The engine must not emit
`missed-note` or `extra-note` under a harmonic reference.

### 3.5 Alignment (melody mode only)

Performed notes are matched to reference notes by time overlap, then by pitch
proximity where a performed note overlaps more than one reference note. The
matching must be:

- **One-to-one.** A performed note takes at most one reference note and vice
  versa.
- **Order-preserving.** Matches may not cross; a singer running late stays late
  rather than being matched to an earlier note.
- **Tolerant.** A performed note whose onset falls within `alignToleranceSec` of
  a reference note's window is a candidate even with no overlap, so that a late
  entry is graded as *late* rather than as *missed plus extra*. This is the
  behaviour today's fixed time-window grading gets wrong.

---

## 4. Performance metrics (S4)

Stored on every scored `PerformedNote`. All cents comparisons are **octave-folded**
(`centsToNearestOctave`), because singers answer in their own register — and
because the real-world baseline measures 2.41% octave errors, which octave-folding
renders harmless for intonation while leaving them visible in register statistics.

| Metric | Type | Definition | Why it exists |
|---|---|---|---|
| `medianCents` | signed | median offset from target across **sustain** frames | The headline intonation number. Median, not mean: a scooped attack or a sagging release must not move it, and the mean is not robust to the octave errors that do occur. |
| `meanAbsCents` | ≥0 | mean absolute offset across sustain frames | Magnitude of error irrespective of direction. `medianCents` near zero with a large `meanAbsCents` means the singer is wandering either side, which is a different fault from being consistently flat. |
| `centsSpread` | ≥0 | p90 − p10 of sustain-frame offsets | **Sustain stability.** Percentile range rather than standard deviation so a single bad frame cannot dominate. This is the metric that distinguishes "held it steadily 20¢ flat" from "wandered 40¢ either side". |
| `attackCents` | signed | median offset across **attack** frames | Where the singer starts relative to where they end up. Negative-then-correcting is scooping from below, the most common amateur habit. |
| `attackSettleSec` | ≥0 | time from onset until offset first stays within `settleTolerance` of `medianCents` for `settleHoldSec` | **Attack accuracy** as the singer experiences it: how long until the note is actually in tune. Distinguishes a clean landing from a slow slide, which `attackCents` alone cannot. |
| `releaseCents` | signed | median offset across **release** frames | **Release behaviour.** Support failing at the end of a note shows here before it shows anywhere else. |
| `releaseDriftCents` | signed | `releaseCents − medianCents` | Isolates the drift from the note's overall tuning: a note 20¢ flat throughout is a different fault from one that starts true and sags 20¢. |
| `durationSec` | ≥0 | `endSec − startSec` | Needed for phrase-level and rhythm-adjacent reporting, and to weight aggregates by how long a note was actually held. |
| `coverage` | 0..1 | voiced frames ÷ frames expected across the note's span | How much of the note was actually phonated. Low coverage means dropouts or breathiness, and it is the correct reason to distrust the note's other metrics rather than silently averaging over gaps. |
| `confidence` | 0..1 | median `clarity` across sustain frames | Stored for every note. **Not used as a gate — see the warning below.** |
| `reliableFraction` | 0..1 | fraction of the note's frames with `reliable === true` | Guards durable statistics against the detector's out-of-band octave failure. |
| `onsetDeltaSec` | signed | performed onset − reference onset | *Melody mode only.* Positive is late. |
| `offsetDeltaSec` | signed | performed end − reference end | *Melody mode only.* Negative is an early release. |

### The confidence warning

`confidence` is stored because it is cheap and because a future detector may
make it meaningful. **It must not gate anything in the MVP.** Measured on the
real-world corpus: a clarity gate at 0.8 catches **0.81%** of genuinely bad
frames, and the median clarity of a *failing* frame is 0.911. The dominant real
failure is octave locking, which is strongly periodic and therefore scores high
clarity. Any design that weights or filters by confidence will achieve nothing
and will look like it is working.

### Metrics deliberately excluded from the MVP

- **Vibrato rate and extent.** A detector exists (`createVibratoDetector`) but
  nothing in the product vision consumes it.
- **Tempo, beat and bar.** There is no beat grid: the chord timeline is empty and
  the exercise flow has no tempo tracking. Timing is measured against reference
  onsets in melody mode and not at all in harmony mode.
- **Timbre, breath, resonance.** Out of scope by the constraints.

---

## 5. Mistake taxonomy

Every mistake is a threshold crossing on a metric from §4, carries its evidence,
and declares the reference kinds it applies to. Thresholds are named constants,
tuned once against the real corpus, and stated in configuration (§9.4) rather
than scattered through the code.

| Kind | Applies to | Definition | Notes |
|---|---|---|---|
| `pitch-sharp` | both | `medianCents > sharpFlatCents` and the note is not `wrong-note` | The most common single-note fault. |
| `pitch-flat` | both | `medianCents < −sharpFlatCents` and not `wrong-note` | |
| `wrong-note` | both | `abs(medianCents) > wrongNoteCents` | Melody mode: the singer is on a different note than intended. Harmony mode: the singer is not on any scale tone. Above this threshold the note is not "out of tune", it is a different note, and reporting it as intonation error would be misleading. |
| `unstable-sustain` | both | `centsSpread > unstableSpreadCents` **and** `durationSec ≥ minPhaseNoteSec` | The duration guard matters: a short note has too few sustain frames for a spread to mean anything. |
| `scooped-attack` | both | `abs(attackCents − medianCents) > scoopCents` **and** `attackSettleSec > slowSettleSec` | Requires both: a note that starts off-pitch but lands immediately is a normal onset transient, not a scoop. |
| `sagging-release` | both | `abs(releaseDriftCents) > releaseDriftCents_threshold` | Direction is carried in the evidence, since sagging flat and rising sharp are different habits. |
| `late-attack` | melody | `onsetDeltaSec > lateAttackSec` | |
| `early-attack` | melody | `onsetDeltaSec < −earlyAttackSec` | |
| `early-release` | melody | `offsetDeltaSec < −earlyReleaseSec` **and** the reference note is longer than `minTimedNoteSec` | The duration guard prevents flagging every short note as released early. |
| `missed-note` | melody | a reference note with no aligned performed note | §3.3 |
| `extra-note` | melody | a performed note with no aligned reference note | §3.4 |
| `low-coverage` | both | `coverage < minCoverage` | Not a musical fault but a measurement caveat, emitted so the UI and the aggregates can both see that this note's other metrics are weakly supported. |

### Notes on the taxonomy

- **"Consistently sharp" is not here.** Consistency is a property of many notes,
  not one, and it belongs to §6 and §7. A single note is sharp; a *singer* is
  consistently sharp. Conflating the two is how a benchmark ends up reporting a
  horoscope.
- **A note may carry several mistakes.** Sharp and unstable are independent
  facts; forcing a single label would discard one of them.
- **Every mistake is derived, never stored as a judgement.** Re-running the
  analysis over the same notes with different thresholds must reproduce a
  different, equally valid mistake list. This is what makes threshold tuning
  possible after the fact.

---

## 6. Session analysis (S5)

A `SessionSummary` aggregates the per-note analyses. It reports **dimensions
separately** — the engineering requirements are explicit that no single score
may hide them, and the existing melodic scorer already violates this by
collapsing to `0.7·pitch + 0.2·rhythm + 0.1·stability`.

```ts
interface SessionSummary {
  notesPerformed: number;
  notesScored: number;               // excludes missing, extra, unreliable, too-short
  coverage: number;                  // 0..1, sung notes ÷ expected (melody) or voiced time ÷ session time (harmony)

  intonation: {
    medianCents: number;             // signed — the singer's central tendency
    meanAbsCents: number;
    withinCents: Record<12 | 25 | 50, number>;  // fraction of scored notes inside each band
    inKeyRate: number | null;        // harmony mode only: notes on a scale tone
  };

  stability: { medianSpreadCents: number; unstableRate: number };
  attack:    { medianSettleSec: number; scoopRate: number };
  release:   { medianDriftCents: number; sagRate: number };

  timing: {                          // melody mode only, null in harmony mode
    medianOnsetDeltaSec: number;
    lateRate: number;
    earlyRate: number;
  } | null;

  mistakeCounts: Record<MistakeKind, number>;
  byPhrase: PhraseSummary[];         // the same dimensions, per phrase
  byRegister: RegisterSummary[];     // bucketed by the engine's operating bands
}
```

### Rules

1. **Only `scored` notes contribute to pitch metrics.** Missing, extra,
   unreliable and too-short notes contribute to counts and coverage only.
2. **Notes are weighted equally, not by duration.** A singer who holds one note
   for eight seconds and rushes six others has seven data points, not two. Where
   duration matters it is reported directly.
3. **Phrase summaries exist to expose within-session decay.** "Intonation falls
   apart near the end of long phrases" is a stated product goal and needs
   position-within-phrase to be visible; §7 turns it into a pattern.
4. **No overall score is specified.** Surfaces that need a single number (the
   existing take score, stars) may compute one from these dimensions, and that
   computation belongs to the surface, not the engine. The engine's job is to
   make the dimensions available and traceable.

---

## 7. Multi-session analysis (S6)

Input: the persisted `SessionRecord[]` (§8). Output: `WeakPattern[]`. Pure,
deterministic, no clock beyond an injected `now`.

**This stage identifies recurring patterns and stops there.** No
recommendations, no exercise selection, no coaching text, no ranking of what to
practise. Those exist elsewhere in the app and are out of scope here by
constraint.

### Pattern kinds

| Kind | Bucket key | Pattern statement |
|---|---|---|
| `interval` | signed semitones (`"-3"`, `"+7"`) | a consistent offset on one melodic interval |
| `register` | exact MIDI note | a consistent offset in one part of the range |
| `pitch-class` | 0–11 | a consistent offset on one pitch class |
| `scale-degree` | 0–11 relative to tonic | a consistent offset on one degree — the leading tone is the classic case |
| `phrase-position` | early / middle / late third of a phrase | degradation across a phrase |
| `mistake-kind` | `MistakeKind` | one fault type recurring far above its base rate |

### Rules

1. **Minimum observations.** A bucket produces no pattern below its minimum
   count. The existing weak-spot engine's discipline carries over verbatim: an
   empty list is an honest answer, an invented weakness is not.
2. **Minimum sessions.** A pattern must appear across at least `minSessions`
   distinct sessions. One bad day is not a pattern.
3. **Consistency, not magnitude.** A bucket qualifies when its offsets are
   consistently signed — not merely large. Ten notes averaging 30¢ flat is a
   pattern; ten notes averaging 0¢ with a 60¢ spread is not, and reporting it
   would be reporting noise.
4. **Every pattern carries plain-language evidence** containing the measurement
   and the observation count, e.g. *"descending minor 3rds, 31¢ flat across 14
   attempts in 5 sessions"*.
5. **Registers come from real pitches only.** Buckets keyed by exact MIDI are
   only fed by notes with `reliableFraction` above threshold, so the detector's
   out-of-band octave failure cannot write a register pattern about a note the
   singer never sang.

---

## 8. Persistence model

On-device only (AsyncStorage, via the existing `progressStore` pattern). Nothing
leaves the phone.

### Three tiers

**Tier 1 — Raw measurements: not persisted.**

A three-minute take at the engine's 86 frames/second is ~15,500 frames. Storing
them per session would exhaust AsyncStorage within weeks and buys nothing the
derived tier does not. Raw frames remain available in-session for re-analysis,
and the existing dev-only diagnostics ring buffer (`lib/diagnostics`) covers
engineering inspection. If offline re-analysis of past takes becomes a
requirement, that is a file-based export, not a store.

**Tier 2 — Derived per-note metrics: persisted, bounded.**

```ts
interface PersistedNote {
  targetMidi: number | null;       // null for extra notes
  scaleDegree: number | null;
  intervalFromPrevious: number | null;
  phraseIndex: number;
  positionInPhrase: number;
  medianCents: number;
  centsSpread: number;
  attackSettleSec: number;
  releaseDriftCents: number;
  durationSec: number;
  coverage: number;
  confidence: number;
  reliableFraction: number;
  mistakes: MistakeKind[];         // kinds only; evidence is re-derivable
  onsetDeltaSec?: number;          // melody mode
}
```

Roughly 120 bytes of JSON per note; a 120-note take is ~15 KB. This tier is what
makes §7 possible without re-running the detector, and what lets thresholds be
re-tuned against history.

**Tier 3 — Aggregated statistics: persisted, unbounded in time.**

The existing `SessionRecord` shape, extended. It must stay small and additive so
that multi-session analysis never has to load Tier 2 for every session.

```ts
interface SessionRecord {
  // --- existing fields, unchanged for backwards compatibility ---
  exerciseId: string; exerciseTitle: string; at: number;
  score: number; stars: number; avgCents: number;
  stability: number; rhythm: number; durationSec?: number;
  notes: Record<number, NoteTally>;          // per pitch class
  notesByMidi?: Record<number, NoteTally>;
  intervals?: Record<string, NoteTally>;

  // --- new ---
  schemaVersion: number;
  source: 'instrumental' | 'exercise';
  songId: string;
  key: string | null;
  referenceKind: 'melody' | 'harmony';
  byScaleDegree?: Record<number, NoteTally>;
  byPhrasePosition?: Record<'early' | 'middle' | 'late', NoteTally>;
  mistakeCounts?: Record<MistakeKind, number>;
  performedNotes?: PersistedNote[];          // Tier 2, may be pruned
}
```

### Rules

1. **Backwards compatible.** Every new field is optional and every reader must
   tolerate records written before it existed — the store already carries
   records from three earlier schema eras. `schemaVersion` is written going
   forward so a future migration has something to branch on.
2. **Retention.** Tier 3 keeps the existing 500-session cap. Tier 2 is pruned
   first: keep `performedNotes` for the most recent `N` sessions and drop it from
   older ones, leaving their aggregates intact. Pattern detection degrades
   gracefully because it reads aggregates.
3. **Instrumental sessions are persisted.** They are not today. Both flows write
   the same record type, distinguished by `source` and `referenceKind`, so §7
   works across both without special-casing.
4. **Aggregates are computed at write time**, not at read time. Multi-session
   analysis over 500 sessions must not require re-deriving tallies.

---

## 9. Interfaces

### 9.1 Input port — pitch detection → engine

The engine does not acquire the microphone, own a lease, or know that
`react-native-audio-api` exists. The caller drives it.

```ts
interface PerformanceSession {
  /** feed one detector frame, in capture order */
  pushFrame(frame: PitchFrame): void;
  /** notes completed so far — for live UI, never for scoring decisions */
  readonly completedNotes: readonly PerformedNote[];
  /** close the session and produce the report */
  finish(): SessionReport;
  reset(): void;
}

function createPerformanceSession(input: {
  song: Song;
  reference: ReferenceModel;
  startedAt: number;          // epoch ms, injected — the engine reads no clock
  config?: Partial<AnalysisConfig>;
}): PerformanceSession;
```

Frames arrive raw. The engine applies its own voice gate and reliability check
in S1; it must not receive pre-filtered pitch.

### 9.2 Output port — engine → UI

The UI consumes plain data and calls nothing back.

- **Live:** `completedNotes` plus the forming note, for the trail and karaoke
  display. The UI applies its own presentation stabilization
  (`shared/lib/noteStabilizer`) and never feeds anything back in.
- **End of take:** the `SessionReport`.
- **History:** `WeakPattern[]` from S6.

The engine exports no components, no hooks, no store. A screen may wrap it in a
hook; that hook lives in the screen's feature, not here.

### 9.3 Persistence port

```ts
interface SessionSink {
  save(record: SessionRecord): void;
  recent(limit: number): SessionRecord[];
}
```

Injected. The engine builds `SessionRecord` values and hands them over; it never
imports zustand or AsyncStorage. Tests supply an in-memory sink.

### 9.4 Configuration

Every threshold in §3–§5 is a field of a single `AnalysisConfig` with documented
defaults. Passing a partial config overrides individual values. This exists so
thresholds can be swept against the benchmark corpus rather than argued about,
exactly as the segmentation thresholds in `features/instrumental/lib/notes.ts`
already are.

### 9.5 Testability

Pure functions plus one stateful session object. Every stage takes data and
returns data, so each is testable in isolation under `node --test` with no
microphone and no React. The existing benchmark corpus can drive S1–S4 directly:
a real recording plus its annotation is exactly a frame stream plus a reference.

---

## 10. Extensibility

### Expected to change

| Area | Why, and what it means |
|---|---|
| **Segmentation (S2)** | The most likely stage to be replaced. Onset and offset error have never been measured against a reference; the real-world baseline puts p95 onset error at 807 ms with an 82.4% note match rate. Keep the algorithm behind the `PerformedNote` contract so it can be swapped without touching S3–S6. |
| **Harmonic reference** | `DetectedChord[]` is empty today. When chord analysis lands, `NoteTarget` gains a `chord-tone` kind and harmony mode gains a per-chord target instead of a per-key one. The `ReferenceModel` union is the extension point; nothing downstream should switch on `kind` outside S3. |
| **Thresholds** | All of §5 is tuning, not structure. Expect every constant to move once real sessions exist. |
| **Confidence** | If the detector's confidence becomes discriminative, `NoteMetrics.confidence` becomes usable as a weight. Nothing should depend on that until it is measured. |
| **Scale-degree and interval analysis** | Currently the thinnest musical layer. Modal borrowing, chromatic passing tones and non-diatonic material are unhandled and will need real theory. |
| **Timing in harmony mode** | Impossible without a beat grid. If chord analysis yields one, `timing` stops being null and the melody-only mistakes gain a harmonic definition. |

### Expected to stay stable

| Area | Why |
|---|---|
| **`PitchFrame` input contract** | Owned by pitch detection, deliberately narrow, and already the seam the benchmark measures through. |
| **`PerformedNote` and `NotePhases`** | The vocabulary everything downstream is written in. Adding fields is fine; changing the meaning of a note is not. |
| **Metric names and units** | Cents signed, seconds, 0..1 fractions. Persisted history is keyed on these; renaming one invalidates the history that makes §7 possible. |
| **The raw/presentation separation** | Non-negotiable. No stage of this engine may consume a display-stabilized or smoothed value. |
| **Determinism and purity** | The property that makes the whole thing testable and the benchmark meaningful. |
| **Persistence envelope** | Optional-field, forward-compatible records with a version. |

### Explicitly out of scope for the MVP

Machine learning; cloud sync; social features; coaching and recommendation text
(the existing `features/learning` owns that); rhythm and tempo analysis; vibrato,
breath, timbre and resonance analysis; new premium features; any change to DSP.

---

## 11. Implementation sequence

A suggested order, each step independently testable and shippable behind the
existing surfaces:

1. **Types and config** (§2, §9.4). No behaviour.
2. **S1 frame conditioning** — voice gate plus reliability, over the benchmark's
   real corpus.
3. **S2 segmentation** — generalize `features/instrumental/lib/notes.ts` to
   emit `PerformedNote` with phases. Measure onset/offset error against the
   corpus annotations; this is the first time that has been possible.
4. **S3 interpretation** — harmony mode first, since it is the product's primary
   flow and needs no alignment. Melody mode and alignment second.
5. **S4 metrics and mistakes** — thresholds seeded from the corpus, then swept.
6. **S5 session summary**, wired into the instrumental end-of-take surface in
   place of `scoreNotes`.
7. **Persistence** — write records from both flows; migrate nothing.
8. **S6 patterns** — only after enough real sessions exist to validate against.

Steps 1–5 have no user-visible effect and can land without UI work. Step 6 is
where the instrumental flow gains a session report, and step 8 is where the
product's "recurring weaknesses" promise is first met for it.
