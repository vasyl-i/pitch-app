# Performed Note Generation — Module Specification (MVP)

Status: specification, 2026-08-04. **Nothing implemented. No DSP change proposed.**
Scope: the first implementation module of the Performance Analysis Engine —
transforming a stream of `PitchFrame`s into a stream of `PerformedNote`s.

Parent: [PERFORMANCE_ANALYSIS_ENGINE.md](PERFORMANCE_ANALYSIS_ENGINE.md), which
divides the engine into stages S1–S6. This document specifies **S1 Frame
Conditioning + S2 Musical Event Generation** as one implementation module.
Companions: [PITCH_ERROR_ANALYSIS.md](PITCH_ERROR_ANALYSIS.md),
[PITCH_ENGINE_AUDIT.md](PITCH_ENGINE_AUDIT.md) — cited throughout for
evidence-based behaviour decisions.

```
  microphone (existing, unchanged)
      │
      ▼
┌───────────────────────────────────────────────────────────┐
│ Pitch Detection (existing, unchanged — DSP layer)          │
│   PitchFrame { frequency, rms, clarity, clipped, when }    │
└───────────────────────────────────────────────────────────┘
      │  raw frames — never smoothed
      ▼
╔═════════════════════════════════════════════════════════╗
║ PERFORMED NOTE GENERATION  ← this document                ║
║   = S1 Frame Conditioning + S2 Musical Event Generation    ║
║                                     → PerformedNote[]       ║
╚═════════════════════════════════════════════════════════╝
      ▼
┌───────────────────────────────────────────────────────────┐
│ S3 Musical Interpretation   (future — out of scope here)   │
└───────────────────────────────────────────────────────────┘
      ▼
   S4 Performance Analysis · S5 Session Summary · S6 Multi-Session
   (future — out of scope here)
```

---

## 0. Consistency review against `PERFORMANCE_ANALYSIS_ENGINE.md`

This task's brief and the parent specification do not line up in six places.
None are silently resolved below; each is stated, and where a choice had to
be made to write anything at all, the choice and its reasoning are stated
separately from the fact of the conflict.

**1. Module boundary vs. stage boundary.** The brief defines this module's
input as a raw `PitchFrame` stream and its output as `PerformedNote[]`. The
parent doc splits that span into two stages: **S1 Frame Conditioning**
(`PitchFrame[] → AnalysisFrame[]`, owns voicing and reliability) and **S2
Musical Event Generation** (`AnalysisFrame[] → PerformedNote[]`, owns
boundaries and phases). A module whose public contract is "PitchFrame in,
PerformedNote out" necessarily contains both stages.
*Resolution taken:* this document specifies S1+S2 as one module, since that
is the contract the brief asks for and it is where the parent doc already
plans to put the code (`src/features/performance-analysis/lib/`, §1 "Where
it lives"). `AnalysisFrame` is kept as an internal shape inside the module,
not part of its public output. This changes packaging, not substance — no
field, rule, or threshold from the parent doc's S1/S2 sections is altered.

**2. `PitchFrame → PerformedNote` skips a stage the parent doc's own metrics
need.** The parent doc's S4 metrics (§4: `medianCents`, `attackCents`,
`releaseCents`, `confidence`, `reliableFraction`, …) are computed from
**per-frame data restricted to a phase's frames** (sustain-only,
attack-only, release-only). The parent's own `PerformedNote` (§2.4) does not
carry per-frame data — only `index`, `startSec`, `endSec`, `phases`,
`frames` (a count), `gapBeforeSec`. Nothing in either document says how S4
gets from "a note's phase time-spans" to "the cents/clarity values of the
frames inside that span." This is a gap in the parent doc, not something
introduced here.
*Not resolved here* — see §11 and §2 for why: the brief restricts this
module's output to `PerformedNote[]` and forbids algorithms, so this
document cannot decide whether S4 re-slices a retained frame log by time
range, or whether `PerformedNote` eventually grows a frame reference. Both
are consistent with "adding fields is fine" (parent §10); neither is decided
by this module. Flagged as an open dependency for whoever specifies S3/S4.

**3. The brief's example `PerformedNote` fields are illustrative, not
authoritative, and two of them conflict with stated boundaries.**
`averageCents` requires a reference point (a scale, a key, or at least "the
nearest chromatic semitone" as a musical judgement) — but §1 of the parent
doc is explicit that this module "must not know about keys, scales or
reference material." `confidence` on a *note* is already a defined
quantity in the parent doc (§4 `NoteMetrics.confidence`, computed by S4 as
median clarity across **sustain** frames only) — restated here it would
either duplicate S4's field under a different owner, or be a whole-note
average that is a strictly worse version of the same thing.
*Resolution taken:* §3 below defines the field set actually justified by
downstream use, using the parent's already-committed names (`index`,
`startSec`, `endSec`, `frames`, `gapBeforeSec`, `phases`), not the brief's
example names (`id`, `startTime`, `duration`, `frameCount`), because the
parent doc states these names are load-bearing: "renaming one invalidates
the history that makes [multi-session analysis] possible" (§10). Renaming
them here would be exactly the silent architecture change this task
prohibits.

**4. The brief's example dependents use different names than the parent
doc's stages.** "Metrics Engine," "Reference Alignment," "Mistake
Classification," "Session Analysis" (from the brief) map to S4, S3, S4, and
S5/S6 respectively in the parent doc — but the mapping is not 1:1: S4 alone
covers both "Metrics Engine" and "Mistake Classification." §10 below uses
the parent's stage names as authoritative and cross-references the brief's
names once, so this mapping isn't left implicit.

**5. Glissando is genuinely ambiguous in the parent doc, not just unspecified
here.** §3.1 of the parent doc defines a note boundary as a pitch departure
from "the run's own centre" that persists — but never states whether that
centre is fixed at note onset or drifts with a slowly, continuously moving
pitch. A glissando is exactly the case where this choice changes the
answer (one note vs. many). This document does not decide it either — see
§7 — because it is a threshold/algorithm decision the brief excludes, but
it is called out explicitly rather than left implicit, since a future
implementer must not assume the parent doc already settled it.

**6. `createPerformanceSession` (parent §9.1) is one interface for the whole
S1–S6 engine, including `song` and `reference: ReferenceModel`.** This
module's own public interface (§2 below) cannot take those parameters
without violating its own no-reference-material constraint, so it is
necessarily a narrower, separate interface, not a subset of the same object.
*Resolution taken:* §2 defines a standalone interface. Whether
`createPerformanceSession` later composes this module internally, or the two
get unified, is left for whichever document specifies S3, since deciding it
here would mean specifying part of S3's construction.

---

## 1. Responsibilities

**This module is responsible for:**

- Deciding, frame by frame, whether the singer is producing voiced sound
  (S1: voicing) and whether a pitch reading is inside the detector's
  declared reliable range (S1: reliability — see
  [PITCH_ENGINE_AUDIT.md §3 N1](PITCH_ENGINE_AUDIT.md), the ~1 kHz
  octave-low failure this exists to contain).
- Deciding where a musical note begins and ends (S2: segmentation).
- Deciding a completed note's internal attack / sustain / release spans
  (S2: phasing).
- Producing a deterministic, ordered `PerformedNote[]`, incrementally as
  frames arrive and finally at session end.

**This module must never:**

- Know what the singer *intended* to sing. There is no reference melody, no
  key, no chord, no target pitch anywhere in this module. (Parent §1: S2
  "must not know about keys, scales or reference material.")
- Judge whether a note was sung well. In tune, out of tune, stable, scooped
  — all of that is a comparison against something, and this module has
  nothing to compare against by design.
- Aggregate across notes. One `PerformedNote` at a time; phrasing, session
  summaries, and multi-session patterns are downstream.
- Read a clock, generate a random number, or perform any I/O. Time arrives
  only as data already present on each `PitchFrame` (`when`) or supplied
  once at session creation.
- Import or call into the DSP layer. It consumes `PitchFrame` as a data
  contract owned by `features/pitch-detection`; it does not import that
  feature's code, and it never modifies it.
- Depend on React, React Native, a UI framework, or any store. It must be
  runnable under `node --test` with no microphone.
- Behave differently for different exercise types, reference kinds, or
  product surfaces. A frame stream from staff practice, ear training, and
  instrumental sing-along all pass through identically. Anything that
  varies by exercise type does not belong in this module.

**Boundary with S3 (Musical Interpretation, future):** S3 is the first
stage permitted to know about a reference. It receives this module's
completed `PerformedNote[]` and decides what each note *means* — its target,
its scale degree, its place in a phrase. This module never reaches forward
into that decision, even to make S3's job easier; a `PerformedNote` is
exactly as meaningful in isolation as it is inside a full session.

---

## 2. Public Interface

### Inputs

- **Frames.** `PitchFrame` values, one at a time, in strict capture order.
  ```ts
  /** Owned by features/pitch-detection. Restated, not redefined, here. */
  interface PitchFrame {
    frequency: number | null;   // Hz, null when unvoiced
    rms: number;
    clarity: number;            // 0..1 periodicity confidence
    clipped: boolean;
    when: number;                // seconds since capture start (audio clock)
  }
  ```
- **Optional session timing.** A single value supplied once, at session
  creation, establishing how the frame stream's own clock (`when`) relates
  to the caller's notion of session time. This module does not read a
  clock; if the caller cares about wall-clock alignment, it provides it
  once, up front. Nothing else about timing is configurable per frame.
- **Optional configuration.** The subset of the parent doc's `AnalysisConfig`
  (§9.4) that governs this module: `gapSec`, `sameNoteSemitones`,
  `minNoteSec`, `attackSec`, `releaseSec`, `minPhaseNoteSec`. No defaults are
  stated here — assigning values is threshold-setting, excluded by
  constraint (§9.4 of the parent doc already establishes that these are
  swept against the benchmark corpus, not decided by inspection).

Explicitly **not** inputs: a `Song`, a `ReferenceModel`, a UI store, a clock,
a random seed.

### Outputs

```ts
interface NoteGenerationSession {
  /** Feed one frame, in capture order. */
  pushFrame(frame: PitchFrame): void;

  /** Notes completed so far, in order. Immutable once present in this list. */
  readonly completedNotes: readonly PerformedNote[];

  /** Close the session; whatever note is in progress is resolved (§4, §6). */
  finish(): readonly PerformedNote[];

  /** Discard all progress and return to a fresh session. */
  reset(): void;
}

function createNoteGenerationSession(input: {
  startedAt?: number;                              // optional session timing
  config?: Partial<NoteGenerationConfig>;
}): NoteGenerationSession;
```

A "forming" (not-yet-completed) note is deliberately **not** exposed by this
interface. The parent doc's engine-level output port (§9.2) mentions
surfacing an in-progress note for a live UI trail — that is a concern of
whatever composes this module for a live screen, not of this module's own
contract. Nothing downstream of `PerformedNote[]` may consume a forming
note; only `completedNotes` and `finish()`'s return value are valid inputs
to S3.

### Events

This module has no push-based event or callback surface — it deliberately
matches the parent doc's own interface (§9.1), which has none. State is
observed by reading `completedNotes` after a `pushFrame` call: a note
"completing" is visible as a new element appearing in that list, not as a
separate notification. A caller that wants a discrete "note completed"
signal computes it by diffing `completedNotes.length` across calls; this
module does not provide that diff itself.

### Error conditions

- **Out-of-order or non-monotonic `when`.** The contract requires capture
  order. A caller that violates it has violated the contract; this module's
  behaviour under violation is unspecified, not defensively handled — the
  benchmark corpus and every real capture path already deliver frames in
  order, so there is nothing to defend against without inventing a case
  that cannot occur.
- **`pushFrame` after `finish()`.** Invalid usage. `finish()` is terminal
  for a session; a caller that wants to keep going calls `reset()` first.
- **Malformed frame values** (e.g. `frequency` negative, `rms` negative,
  `clarity` outside 0..1). Not this module's concern to validate — it is a
  contract already owned by `features/pitch-detection`, and re-validating it
  here would be exactly the kind of defensive check the project's stated
  practice avoids for internal, already-guaranteed data.

### Lifecycle

Two lifecycles exist at different granularities and must not be confused:

- **Session lifecycle** (this section): *created* → *receiving frames*
  (zero or more `pushFrame` calls) → *finished* (terminal, via `finish()`)
  or *reset* (returns to *receiving frames* with no memory of what came
  before).
- **Note lifecycle** (§4): what happens to one candidate musical event
  while the session is in the *receiving frames* state.

`reset()` discards `completedNotes` and any in-progress candidate
unconditionally. There is no partial reset.

---

## 3. PerformedNote model

Every field below is justified by a specific downstream use already stated
in the parent doc. No field from the brief's example list is included
without that justification (§0.3); no field is added beyond what the parent
doc already committed to, because the gap identified in §0.2 is explicitly
not this document's decision to make.

```ts
interface PerformedNote {
  index: number;
  startSec: number;
  endSec: number;
  phases: NotePhases;
  frames: number;
  gapBeforeSec: number;
}

interface NotePhases {
  attack:  { fromSec: number; toSec: number };
  sustain: { fromSec: number; toSec: number };
  release: { fromSec: number; toSec: number };
}
```

| Field | Purpose | Units | Downstream use |
|---|---|---|---|
| `index` | Stable position of this note within the performance, in emission order. | integer, 0-based | S3's `InterpretedNote.performed` and S4's `NoteAnalysis.noteIndex` correlate 1:1 with it (parent §2.5, §2.6). It is the join key between a `PerformedNote` and everything computed about it later. An opaque `id` is not used: notes are produced as a single ordered stream within one session, so position already is a stable, sufficient identity — a second identity scheme would have no consumer. |
| `startSec` / `endSec` | The note's temporal boundary — first and last voiced frame belonging to it. | seconds, session-relative | S3's time-overlap alignment against reference notes (parent §3.5); S4's `onsetDeltaSec`/`offsetDeltaSec` (parent §4); phrase grouping; `SessionReport.durationSec` aggregation. Every later stage that reasons about *when* a note happened reads these two fields — nothing else carries timing. |
| `phases` | The attack / sustain / release sub-spans of the note (§5). | seconds, same clock as `startSec`/`endSec` | S4's phase-specific metrics (`attackCents`, `medianCents`/`centsSpread` from sustain, `releaseCents`/`releaseDriftCents`) are each defined over exactly one phase's frames (parent §4). Without phase spans, S4 cannot distinguish "flat throughout" from "started flat, corrected" — the entire attack/release metric family depends on this field existing. |
| `frames` | Count of voiced frames contributing to the note. | integer | S4's `coverage` metric is voiced frames ÷ frames expected across the note's span (parent §4) — this is the numerator. It is also the raw signal behind "was this note actually sung, or just structurally present" — a note with very few frames relative to its duration is a note mostly missing. |
| `gapBeforeSec` | Silence elapsed since the previous completed note ended. | seconds, ≥ 0 | Feeds phrase-break detection in S3 (parent §2.5's `phraseIndex`/`positionInPhrase` — a phrase boundary is a place where the singer paused) and, transitively, S6's phrase-position patterns (parent §7). It is also the only field that lets a downstream stage distinguish "breath before this note" from "no gap," a distinction §7 of this document relies on for breath and cough behaviour. |

**Fields deliberately not included, and why:**

- **`duration`.** Trivially `endSec − startSec`; the parent doc computes it
  at that point (§4 `durationSec`) rather than storing it redundantly on an
  otherwise-immutable record. Storing both risks no divergence here (the
  note is immutable once completed — §9), but there is still no stated
  consumer of a stored duration that isn't already served by the two fields
  it derives from.
- **`averageMidi` / pitch range.** No stage in the parent doc reads a
  whole-note average pitch; every pitch-related metric it defines is
  phase-scoped (attack vs. sustain vs. release), which a single average
  cannot serve. Adding it would be a field with no consumer.
- **`averageCents` / `confidence`.** Excluded per §0.3 — both require either
  reference knowledge this module must not have, or duplicate a
  phase-scoped computation (`NoteMetrics.confidence`) that the parent doc
  already assigns to S4.
- **A frame-level array.** This is the gap from §0.2. Adding it here would
  resolve that gap by fiat, which the brief's "do not propose algorithms"
  and "produce PerformedNote[] only" constraints both argue against. It is
  named as an open question, not answered as a field.

---

## 4. Musical Event Lifecycle

```
No note
   │  first voiced frame after silence
   ▼
Candidate
   │  run persists past minNoteSec
   ▼
Confirmed
   │  (continues receiving frames)
   ▼
Active
   │  a terminating condition is detected (§6) — but not yet finalized
   ▼
Released
   │  phases are computed over the now-known span
   ▼
Completed
```

- **No note.** The idle state. No run is in progress; either the singer is
  silent, or every recent frame has been unvoiced/discarded.
- **Candidate.** A run of voiced frames has begun, but has not yet persisted
  long enough (`minNoteSec`) to be treated as a real musical event. A
  Candidate can end without ever becoming a note: if a terminating
  condition (§6) fires while still a Candidate, the run is discarded, not
  emitted (parent §3.1: "A run shorter than `minNoteSec` is discarded, not
  emitted"). Nothing about a discarded Candidate is ever visible outside
  this module.
- **Confirmed.** The run has now persisted past `minNoteSec`. It is a real
  musical event from this point on — this is a one-way transition, since
  elapsed duration cannot un-elapse.
- **Active.** The confirmed note continues to accrue frames. Its final
  boundary, and therefore its phases, are not yet known. This is the state
  a note spends most of its life in while the singer is still sustaining
  it.
- **Released.** A terminating condition (§6) has fired and persisted long
  enough to be trusted, not merely brushed against (§5, §6 — a momentary
  excursion cancels and returns the note to Active rather than advancing
  it to Released). The note's endpoint is now fixed.
- **Completed.** The note is finalized: phases are computed over the fixed
  span, and the note is appended to `completedNotes`. From this instant it
  is immutable (§9).

A Candidate never transitions directly to Completed — it must pass through
Confirmed and Active first. There is no lifecycle path that skips
Confirmed.

---

## 5. Musical Event Semantics

**Attack** is the portion of a completed note from its onset up to
`attackSec` or 25% of the note's duration, whichever is shorter (parent
§3.2). This is where the singer arrives at the pitch; scooping and overshoot
are, by definition, attack-phase phenomena.

**Sustain** is everything between attack and release. It is what the note
"is," for intonation purposes — the phase every headline pitch metric is
computed from.

**Release** is the final `releaseSec` or 20% of the note's duration,
whichever is shorter. It is where breath support most often fails and pitch
sags.

A note too short to hold all three phases distinctly is still emitted, but
is marked unsuitable for phase-dependent metrics downstream (parent §3.2:
must be at least `minPhaseNoteSec` for attack and release to be measured
separately, "or the three spans overlap and report the same frames three
times"). This module still computes *some* phase spans for such a note —
it does not omit `phases` — but whether those spans are trustworthy for
per-phase metrics is a judgement S4 makes, not this module.

**One musical note** is a maximal run of voiced frames whose pitch stays
within a tolerance band of the run's own centre (parent §3.1), bounded by
silence, a persisting pitch departure, or the end of the session.

**Repeated notes** are two separate Completed notes that happen to share
the same nominal pitch, separated by a gap (silence) or a departure-and-
return. Nothing about this module's model distinguishes "the same note sung
twice" from "two different notes that happen to land on the same pitch" —
that distinction, if it matters, is a musical judgement for a later stage.

**Connected (legato) notes** are two separate Completed notes with
`gapBeforeSec` at or near zero — no silence between them, but a pitch
departure large enough to persist still ends the first note and starts the
second. Absence of a gap does not mean absence of a boundary.

**Separate notes**, generally: any two elements of `completedNotes`. Their
separateness is exactly the fact that segmentation (§3.1's rules) drew a
boundary between them — there is no other test.

**Deliberately not a boundary:** crossing a note-name boundary (e.g., the
frequency corresponding to the line between two chromatic pitches) with no
accompanying persisting departure. A singer sitting between two notes is
singing one note, badly — not two notes. This is stated in the parent doc
(§3.1) as an explicit non-boundary, and it is restated here because it is
the semantic anchor for §7's "unstable pitch" and "vibrato" behaviour: those
cases are, definitionally, pitch movement that does not persist, and this
rule is why they do not fragment a note.

---

## 6. State Transitions

| From | To | Trigger | Notes |
|---|---|---|---|
| No note | Candidate | first voiced frame | — |
| Candidate | Candidate | further voiced frames, run < `minNoteSec` | still forming |
| Candidate | No note | a terminating condition fires before `minNoteSec` | discarded, never emitted (§4) |
| Candidate | Confirmed | run persists past `minNoteSec` | one-way |
| Confirmed | Active | (immediate) | Confirmed and Active are the same ongoing run; Confirmed marks the instant of crossing `minNoteSec` |
| Active | Active | further voiced frames within tolerance, or a departure that has not yet persisted | the common case |
| Active | Active | a brief unvoiced patch shorter than `gapSec` | not treated as silence (parent §3.1) |
| Active | Released | silence persists past `gapSec`, **or** pitch departure persists, **or** session ends | the three terminating conditions (§3.1) |
| Released | Completed | phases computed over the now-fixed span | immediate; Released is not a state that lingers |
| Completed | Completed | (terminal) | a Completed note never changes (§9) |

**Invalid transitions**, stated explicitly:

- **Completed → anything.** A Completed note is immutable. There is no path
  back into Active, Released, or any other state for a note once it
  appears in `completedNotes`.
- **Active → Candidate.** Confirmation is one-way; elapsed duration does not
  reverse.
- **Released → Active.** Once a terminating condition has *persisted* long
  enough to be trusted (not merely brushed against), the boundary is fixed.
  A momentary excursion that returns before persisting is not a case of
  "Released then un-Released" — it never reached Released in the first
  place, and the note simply continues in Active. This is the mechanism
  that prevents vibrato and ordinary pitch wobble from producing state
  flapping (§7).
- **No note → Completed.** Every note passes through Candidate, Confirmed,
  and Active first; there is no shortcut.

---

## 7. Edge Cases

Behaviour only — no thresholds, no algorithms.

| Case | Behaviour |
|---|---|
| **Silence** | No voiced frames; the session stays in *No note*, or an in-progress note is ended by the silence-persistence rule once the gap exceeds `gapSec`. A brief silence shorter than that does not end a note (parent §3.1 — mid-vowel dropouts are expected and measured at 2.50% on clean professional singing). |
| **Noisy frames** | Frames that are voiced but low-quality are not specially detected as "noise" by this module — see §8. If a noisy frame is not voiced, it is silence for segmentation purposes. If it is voiced, it participates in the same tolerance-band and persistence rules as any other frame; there is no separate noise-handling path. |
| **Unstable pitch** | Handled identically to vibrato (below): movement that does not persist past the tolerance band does not end the note. This module cannot and does not distinguish "unintentional wandering" from "vibrato" — that is a quality judgement (§1), deferred entirely to S4, which is exactly why the parent doc excludes vibrato rate/extent from its own MVP metrics (parent §4). |
| **Octave jumps** | A genuine, intended octave jump (e.g., an arpeggio note an octave up) persists past the tolerance band and correctly becomes a note boundary — no special handling needed. A *spurious* octave error from the detector (an unreliable frame, per `PITCH_ENGINE_AUDIT.md` N1) is a different case, handled in §8: the frame still counts as voiced for continuity, but its pitch value is not trusted evidence of a departure. This module must not let a detector's confident-but-wrong octave-low reading manufacture a false note boundary. |
| **Vibrato** | A periodic pitch oscillation that, by construction, does not persist in one direction — each excursion returns before the persistence condition is met. Treated as ordinary within-note movement; never a boundary on its own (§5, §6). |
| **Glissando** | **Ambiguous by the parent doc, not resolved here** — see §0.5. Whether a slow, continuous pitch slide is one note or several depends on whether "the run's own centre" (parent §3.1) is fixed at onset or drifts with the singer, a question the parent doc does not answer and this document does not decide, since it is exactly the kind of algorithmic choice excluded by constraint. |
| **Breath** | If genuinely unvoiced, identical to silence — ends the current note if it persists past `gapSec`, and is recorded as the next note's `gapBeforeSec`. If a breath produces a brief spurious pitched reading, it is handled as "short accidental sounds" (below). |
| **Cough** | If unvoiced (the common case), identical to silence — no note, contributes only to surrounding gaps. If briefly voiced but shorter than `minNoteSec`, it is a Candidate that is discarded, never emitted (§4). This module has no way to distinguish a cough that happens to exceed `minNoteSec` from a genuine very short sung note — that is a stated limitation, not a gap to close here; distinguishing them would require information (intent, timbre classification) this module does not have and is not supposed to have. |
| **Short accidental sounds** | Governed entirely by the `minNoteSec` discard rule (§4). Anything voiced and pitched but too brief to confirm is discarded with no trace in the output. |
| **Microphone dropouts** | From this module's point of view, a dropout and genuine silence are the same input shape — an absence of usable frames over an interval — and are handled identically by the silence-persistence rule. If the upstream frame producer delivers something other than absence during a dropout (e.g., garbage values), that is a contract question for the DSP layer, out of scope here by constraint. |

---

## 8. Confidence Propagation

**What comes from `PitchFrame`:** `clarity` (0..1 periodicity confidence)
and, via this module's own S1 responsibility, a reliability decision
derived from whether the frequency falls inside the detector's declared
usable range (parent §2.2's `reliable`, backing `isReliableF0` — see
`PITCH_ENGINE_AUDIT.md` N1). These are frame-level facts this module
receives or derives; it does not invent a third confidence signal.

**What belongs to the completed note:** nothing, in this module. Aggregating
frame-level confidence into a per-note figure (`NoteMetrics.confidence` as
median clarity across sustain frames, `reliableFraction` as the fraction of
reliable frames) is explicitly S4's responsibility in the parent doc (§4).
This module's output contract is `PerformedNote[]` with no confidence field
(§3) — it propagates the *frames* that carry confidence information forward
in time (via the note's span), not a summary of them.

**How confidence is used inside this module — conceptually:**

- **Voicing** (is this frame the singer at all) is treated as a hard
  gate: an unvoiced frame is never inside a note.
- **Reliability** (is this frame's pitch value trustworthy) is treated
  differently and more carefully: an unreliable frame still counts as
  voiced for continuity — it does not create a false silence gap — but its
  pitch value must not be trusted as evidence of a pitch departure large
  enough to end a note. The reason this matters, stated plainly: the
  documented failure mode this exists to guard against is a detector
  reporting a full octave low with *high* apparent clarity (median clarity
  0.911 on failing frames, per `PITCH_ERROR_ANALYSIS.md` §4) — exactly the
  profile of a frame that would otherwise look like unambiguous evidence of
  a one-octave jump. Treating it as trustworthy departure evidence would
  convert a detector bug into a fabricated note boundary.
- **`clarity` as a raw number is explicitly not a gate here**, for the same
  reason it is not a gate anywhere else in the app today: measured against
  the real-world corpus, a clarity threshold at 0.8 catches 0.81% of
  genuinely bad frames while the median clarity of a *failing* frame is
  0.911 (`PITCH_ERROR_ANALYSIS.md` §4). Any segmentation behaviour that
  weights or filters on `clarity` alone would achieve nothing while
  appearing to work. This module uses reliability (the range check), not
  clarity, wherever a trust decision about a pitch *value* is required.

This is a propagation rule, not an algorithm: it says which signals feed
which decisions, not by how much or at what threshold.

---

## 9. Invariants

- **A Completed note never changes.** No field of a `PerformedNote` already
  present in `completedNotes` is ever mutated after it appears there.
- **Completed notes never overlap.** For consecutive notes by `index`,
  `endSec` of one is ≤ `startSec` of the next.
- **`startSec` precedes `endSec`**, strictly, for every note — guaranteed by
  `minNoteSec` being positive.
- **`index` is monotonically increasing with `startSec`.** Notes are
  emitted in the order they occurred; nothing downstream needs to re-sort
  them.
- **Every voiced frame belongs to at most one Completed note.** Some voiced
  frames belong to none: those in a discarded Candidate, or those judged
  unvoiced/silence. No frame is ever claimed by two notes.
- **`gapBeforeSec` is never negative.**
- **Determinism.** The same frame sequence plus the same configuration
  produces the same `PerformedNote[]`, always. No clock reads beyond the
  data already on each frame, no randomness.
- **No reference material anywhere in this module's state.** No field,
  local variable, or configuration value names a key, a scale, a chord, or
  a target pitch.
- **This module does not modify, wrap, or reimplement the DSP layer.** It
  consumes `PitchFrame` as an externally-owned data contract only.

---

## 10. Dependencies

Everything downstream of S2 depends on this module, transitively or
directly, because `PerformedNote[]` is the sole channel through which raw
performance data leaves the segmentation layer. Using the parent doc's
stage names (with the brief's example names noted once each, per §0.4):

- **S3 Musical Interpretation** ("Reference Alignment" in the brief) —
  directly depends on this module. It needs `startSec`/`endSec` to align
  performed notes against reference notes by time overlap (parent §3.5),
  and `gapBeforeSec` to detect phrase breaks (parent §2.5).
- **S4 Performance Analysis** ("Metrics Engine" and "Mistake
  Classification" in the brief — one stage in the parent doc, not two) —
  directly depends on this module's `phases` for every phase-scoped metric
  and on `frames` for `coverage`. See §0.2 for the open question of how it
  obtains frame-level pitch data within those spans.
- **S5 Session Summary** ("Session Analysis" in the brief) — depends on
  this module only indirectly, through S4's per-note output. It never
  reads a `PerformedNote` directly.
- **S6 Multi-Session Analysis** — depends on this module only through S5's
  persisted aggregates. Two stages removed; included here only because the
  brief's example list names it.

No module depends on this one's internal `AnalysisFrame` shape — that type
does not cross this module's public boundary (§2).

---

## 11. Acceptance Criteria

- **Deterministic.** Identical frame input and configuration always produce
  identical `PerformedNote[]` output.
- **Pure.** No I/O, no wall-clock reads, no randomness. Time is data.
- **No UI dependency.** Runs under `node --test`; no React, React Native, or
  store import anywhere in the module.
- **No functional DSP dependency.** Consumes the `PitchFrame` data contract
  only; imports no code from `features/pitch-detection` and reimplements no
  part of pitch detection.
- **No reference, scoring, mistake, or session logic.** Verified against
  §1's "must never" list, not merely absent from the happy path.
- **Output vocabulary matches the parent doc exactly.** `PerformedNote` and
  `NotePhases` field names and units are unchanged from
  `PERFORMANCE_ANALYSIS_ENGINE.md` §2.4 (per §0.3 — this is a compatibility
  requirement, not a style preference).
- **Sufficiency claim is scoped honestly.** The output is sufficient for
  every later-stage need expressible purely in terms of note boundaries,
  phase spans, frame counts, and inter-note gaps. It is **not** claimed to
  be sufficient for phase-scoped pitch/confidence metrics without
  resolving the gap in §0.2 — that resolution belongs to whichever document
  specifies S4, not to this one.
