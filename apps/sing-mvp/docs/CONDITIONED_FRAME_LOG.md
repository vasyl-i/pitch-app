# Conditioned Frame Log — Architecture Specification (MVP)

Status: specification, 2026-08-04. **Nothing implemented. No DSP change proposed.**
Scope: closes the architectural gap identified during the Performed Note
Generation review — later analysis stages need conditioned per-frame data
that `PerformedNote` deliberately does not carry.

Parents: [PERFORMANCE_ANALYSIS_ENGINE.md](PERFORMANCE_ANALYSIS_ENGINE.md),
[PERFORMED_NOTE_GENERATION.md](PERFORMED_NOTE_GENERATION.md). This document
does not redesign either. It names and specifies an object both already
assume exists.

This is an architecture-level document. It defines what the Conditioned
Frame Log is responsible for, who owns it, what it conceptually contains,
how it is queried, and how it relates to the objects around it. It does not
define fields, types, storage layout, or compression — those are
implementation decisions for whoever builds this.

---

## 1. Responsibilities

**The Conditioned Frame Log is responsible for:**

- Retaining, for the duration of one analysis session, the conditioned
  per-frame output that Frame Conditioning already computes on its way to
  segmentation — the voicing decision, the reliability decision, the
  conditioned pitch value, the detector's confidence measure, and a
  timestamp — in a form addressable by time.
- Letting later stages retrieve the frames belonging to a given time span
  without re-deriving voicing or reliability themselves.
- Existing purely as an analysis-time facility with no life beyond the
  session that created it.

**The Conditioned Frame Log is not responsible for:**

- Deciding what a frame means musically. That is Performed Note
  Generation's job (boundaries and phases), Reference Alignment's job
  (target), and Metrics Engine's job (measurement) — the Log is upstream of
  all musical interpretation.
- Computing any statistic, metric, or aggregate. It is a retention and
  lookup facility, not a calculator. It answers "what happened between
  these two times," never "how well was this sung."
- Persisting anything, ever (§8).
- Doubling as a debugging or diagnostics tool. `PERFORMANCE_ANALYSIS_ENGINE.md`
  already names a separate, existing facility for that —
  [PERFORMANCE_ANALYSIS_ENGINE.md:576-578](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:576),
  "the existing dev-only diagnostics ring buffer (`lib/diagnostics`)... covers
  engineering inspection." That facility is dev-only, with zero cost in
  production. The Conditioned Frame Log is the opposite: a production
  dependency, required in every real analysis session, because production
  metrics in §4 of that same document cannot be computed without it. The
  two must not be conflated or merged — one is optional tooling, the other
  is load-bearing.
- Modifying `PerformedNote` in any way, or being embedded inside it (§6).
- Knowing about a reference, key, chord, or target. It inherits this
  boundary directly from Frame Conditioning, which produces it before any
  reference exists.

---

## 2. Lifetime

**Who creates it.** Frame Conditioning — the same internal logic that
already computes voicing and reliability for every incoming frame on its
way to segmentation, per
[PERFORMANCE_ANALYSIS_ENGINE.md:103](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:103)
("S1 owns: deciding which frames are the singer, and whether a reading is
trustworthy"). The Log does not need a new producer. It needs that
producer's existing output retained instead of discarded once segmentation
has consumed it.

**When it becomes available.** Incrementally, frame by frame, in lockstep
with each `pushFrame` call on the Performed Note Generation session
([PERFORMED_NOTE_GENERATION.md §2](apps/sing-mvp/docs/PERFORMED_NOTE_GENERATION.md:174)).
The same moment a frame is conditioned for segmentation is the moment it
becomes available in the Log. There is no separate batch-build step and no
delay.

**Which modules may access it.** Bounded by
[PERFORMANCE_ANALYSIS_ENGINE.md:118-121](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:118),
rule 3: "S1–S4 consume the detector's unmodified output." Concretely:

| Stage | Access | Why |
|---|---|---|
| Frame Conditioning | writes | producer |
| Performed Note Generation | writes (same module), may read | co-located with the producer per `PERFORMED_NOTE_GENERATION.md §0.1`; segmentation itself does not need to *query* the log, since it consumes each frame as it arrives, but nothing prevents it |
| Reference Alignment | reads | may need frame-level pitch for alignment decisions that look at more than note timing |
| Metrics Engine | reads | the primary, motivating consumer — every phase-scoped metric in §4 of the parent doc (§7) |
| Mistake Classification | **no access** | consumes Metrics Engine's already-derived output, not raw frames |
| Session Analysis | **no access** | consumes derived per-note analyses, never the log |
| Progress Analysis | **no access** | two stages removed; never sees per-session data at all, let alone frame-level data |
| Any UI | **no access** | see §9 |

**When it is destroyed.** When the analysis session ends — when the
composed engine object finishes producing its session report, or is reset.
Nothing holds a reference to it afterward.

**Whether it survives beyond the current analysis session.** No. This is
the task's explicit constraint and the reason this document exists as a
separate object rather than a field on something longer-lived (§6, §8, §9).

---

## 3. Ownership

**Frame Conditioning owns it.** Reasoning through the alternatives:

- **Pitch Detection (DSP layer)** cannot own it. It has no concept of
  voicing or reliability — those are explicitly Frame Conditioning's
  decisions, not the detector's. Ownership here would mean the DSP layer
  carries an analysis-domain concept, which crosses the boundary the whole
  engine is built to keep clean, and this task explicitly excludes touching
  DSP.
- **Metrics Engine** cannot own it. It is a reader (§7), not a producer — it
  has no access to the conditioning decisions except through the Log
  itself. If it owned the Log it would need to reproduce Frame
  Conditioning's logic to populate it, duplicating work that already
  happens one stage earlier.
- **"Performance Analysis"** as a whole is too broad to be an owner — it is
  the name of the entire six-stage engine, not a stage that produces
  anything specific.
- **Frame Conditioning** is the only candidate that already has the
  content, at the moment it is computed, with no dependency on anything
  downstream — it needs no reference, no note boundary, no target to
  produce a conditioned frame.

Because `PERFORMED_NOTE_GENERATION.md` §0.1 already packages Frame
Conditioning and Performed Note Generation as one implementation module,
ownership sits with that module in practice — but specifically with its
Frame-Conditioning responsibility, not its segmentation responsibility. The
Log and `PerformedNote` are **siblings** produced by the same module, not
one containing the other. §6 depends on this distinction being exact.

---

## 4. Stored Information

Conceptually, per frame — no field names, types, storage layout, or
compression implied:

- **A conditioned pitch value**, or an explicit absence when the frame is
  unvoiced.
- **A timestamp**, on the same time base Frame Conditioning already
  establishes for every conditioned frame.
- **Detector reliability** — whether this frame's pitch reading falls
  inside the detector's declared trustworthy range. This is not a
  restatement of raw detector output; it is the reliability *judgement*
  Frame Conditioning already makes, the same one that exists specifically
  so a confidently-wrong octave-low reading is never silently trusted
  anywhere downstream (`PERFORMED_NOTE_GENERATION.md §8`).
- **Detector confidence** — the periodicity/clarity measure already
  produced for every frame.
- **Voiced/unvoiced state** — whether the frame was judged to be the
  singer at all, as distinct from whether its pitch reading (if any) is
  reliable. These are two separate judgements and the Log's information
  contract keeps them separate, because `PERFORMED_NOTE_GENERATION.md §8`
  already establishes that an unreliable frame is not the same thing as an
  unvoiced one — an unreliable frame still counts as the singer, just with
  an untrustworthy pitch value.

This is, in information content, exactly what Frame Conditioning already
computes per frame — the Log is a retained, time-ordered sequence of that
content, not a new shape invented for this document. What form it takes,
whether every one of these is stored per frame or some are derivable, and
how much memory it costs, are implementation questions explicitly out of
scope here.

---

## 5. Access Model

Time-addressed, not index-addressed. Every consumer identified in §2
reasons about a span of time — a note's boundary, a phase's boundary, an
arbitrary window — never about a raw position in the frame sequence. Three
shapes of query, all reducible to the same underlying operation:

- **Time range** — an arbitrary `[from, to)` bound. The general case; the
  other two are special cases of it.
- **Note interval** — a performed note's full span, for a consumer that
  wants everything belonging to one note.
- **Phase interval** — one of a note's attack/sustain/release spans, for a
  consumer that wants only the frames from one phase. This is the shape
  most of the parent doc's §4 metrics actually need (sustain-only for
  `medianCents`, attack-only for `attackCents`, and so on).

Because all three reduce to "frames between two times," the Log itself
never needs to know that notes or phases exist — it is the caller (Metrics
Engine, holding a `PerformedNote`'s own boundaries) that supplies whichever
range it needs. This is exactly what keeps the Log independent of any
specific metric and independent of `PerformedNote`'s internal structure:
the Log never reads `NotePhases`, it is only ever handed two numbers.

One requirement is not optional: results must come back **in time order**.
The previous review identified a metric (`attackSettleSec`) that needs to
scan forward from a note's onset until a condition first holds — that is
only answerable against an ordered sequence, and its settling window is not
guaranteed to stay inside the attack phase as currently defined
(`PERFORMED_NOTE_GENERATION.md §5`, attack = the shorter of `attackSec` or
25% of the note). A query that returned an unordered set, or that could
only be sliced along phase boundaries, would not support that metric. This
is a behavioural requirement of the access contract, not a compression or
storage decision.

---

## 6. Relationship with `PerformedNote`

Why `PerformedNote` intentionally carries no frame-level data — restating
and now completing what `PERFORMED_NOTE_GENERATION.md §0.2` and §3 already
established, with a name for the other half of the answer:

- **`PerformedNote` answers "when did a note happen, and what are its
  phases."** A small, symbolic description of a segmentation decision. Its
  value depends specifically on staying small and stable enough to survive
  into persisted history essentially unchanged in shape —
  [PERFORMANCE_ANALYSIS_ENGINE.md:743](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:743):
  "the vocabulary everything downstream is written in... renaming one
  invalidates the history."
- **The Conditioned Frame Log answers "what did the singer actually
  produce, frame by frame, while that was happening."** Large,
  session-scoped, and by design not meant to outlive the session (§8).
- **These are different lifetimes with a shared boundary problem if
  merged.** If `PerformedNote` carried its own frames, its "must never
  persist" obligation would have to be re-derived and re-enforced on every
  downstream object built from it, rather than being true by construction
  of a type the persistence path never touches at all. Keeping them
  separate means "never persist raw frames" is enforced by the Log simply
  never being reachable from anything that gets serialized — not by
  remembering to strip a field off `PerformedNote` correctly, every time,
  everywhere it is written.
- **The responsibility split, stated plainly:** `PerformedNote` (produced by
  segmentation) owns *boundaries and structure*. The Log (produced by
  conditioning) owns *content*. A `PerformedNote`'s `startSec` / `endSec` /
  `phases` are a lens for querying the Log — not a copy of, or a substitute
  for, anything inside it.

This is also why `PERFORMED_NOTE_GENERATION.md §3`'s decision not to add a
frame-level array to `PerformedNote` stands unchanged by this document: the
answer to "where does frame-level data live" was never "nowhere" — it was
"somewhere else, on purpose." This document is that somewhere else.

---

## 7. Relationship with Metrics Engine

Metrics Engine is the one stage that combines all three of the following,
and the only one that needs to:

| Source | Provides | Answers |
|---|---|---|
| `PerformedNote` | the note's span and its phase spans | *where to look* |
| Reference Alignment's output | the target for this note (or none, in harmony mode's nearest-scale-tone case, or "none" for an extra note) | *what to measure against* |
| Conditioned Frame Log | the conditioned frames inside whatever span is currently being examined | *what was actually sung* |

A metric like `attackCents` is, architecturally: take the attack-phase span
from a `PerformedNote`, query the Log for the conditioned frames in that
span, compare each against the target Reference Alignment supplied for that
note, and summarize. No stage upstream of Metrics Engine can do this
comparison — the Log has no reference-awareness (§1, §4) and `PerformedNote`
has no frame-awareness (§6) — so combining all three is necessarily where
Metrics Engine's own responsibility begins. Nothing above states *how* the
comparison or summarization happens; only which three sources feed it and
which role each plays.

---

## 8. Persistence

At the end of an analysis session, three things exist, and they must stay
distinct:

- **Temporary analysis data — the Conditioned Frame Log.** Discarded in
  full when the session ends (§2). Never serialized. Never written to
  `AsyncStorage`. Never referenced by anything that outlives the session.
- **Persisted session data — derived per-note and per-session records.**
  `PersistedNote` (Tier 2) and `SessionRecord` (Tier 3), as already
  specified in
  [PERFORMANCE_ANALYSIS_ENGINE.md §8](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:565).
  Both already contain only *derived* values — cents, durations, coverage,
  mistake kinds — never raw frames. This document changes nothing about
  that; it only names where those derived values' raw evidence lived on the
  way to being derived.
- **Aggregated history — `WeakPattern[]`.** Built later from many
  `SessionRecord`s, two stages removed from the Log. It has never had
  access to it (§2) and never will.

**Must never be persisted:** any conditioned frame, at any resolution, in
any form — not the full Log, not a filtered subset, not a compressed
summary. This is categorical, not a matter of degree. The reasoning that
already excluded raw frames from persistence in the parent doc applies at
full force here: a three-minute take produces roughly 15,500 frames,
measured to exhaust on-device storage within weeks if retained per session
([PERFORMANCE_ANALYSIS_ENGINE.md:572-575](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:572)).
The Log is exactly that data, made addressable for the duration it's
needed — persisting any part of it would reintroduce the cost that
decision already rejected.

---

## 9. Architectural Invariants

- The Log belongs to exactly one analysis session. It is never shared
  across sessions, never reused, never pooled between takes.
- The Log does not rewrite what it already holds. A conditioned frame,
  once produced, does not change; the Log only grows as new frames arrive.
- The Log is destroyed when its owning session ends. No reference to it
  outlives that session's `finish()` or `reset()`.
- `PerformedNote` never owns, embeds, or references frame-level data —
  true by construction, since the Log is a separate object with its own
  lifetime, not a field on `PerformedNote` (§6).
- No UI component may access the Log directly. Its consumers are bounded
  to S1–S4 (§2); this includes the live-UI "forming note" preview
  `PERFORMED_NOTE_GENERATION.md §2` already excludes from that module's
  contract — if a not-yet-completed note isn't exposed to the UI, the raw
  frames underneath it certainly are not either.
- No reader modifies the Log. It is write-once-per-frame by Frame
  Conditioning and read-only to everything else.
- The Log carries no reference material — no key, scale, chord, or target
  — for the same reason Frame Conditioning and Performed Note Generation
  don't (`PERFORMED_NOTE_GENERATION.md §9`): it exists before any
  reference is known.
- The Log is never reachable from anything that gets serialized. This
  holds because nothing that gets serialized (`PersistedNote`,
  `SessionRecord`) holds a reference to it in the first place — not
  because a serializer is trusted to filter it out (§6, §8).
- Determinism: for a given frame sequence, the Log's content is identical
  every time. It inherits this directly from Frame Conditioning's own
  determinism requirement
  ([PERFORMANCE_ANALYSIS_ENGINE.md:112-114](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:112)),
  since the Log is nothing more than that stage's output, retained rather
  than discarded.

---

## 10. Dependencies

- **Performed Note Generation** — already depends on Frame Conditioning's
  output today, internally, to perform segmentation. This document does
  not create that dependency; it gives a name and a lifetime to the
  byproduct of it.
- **Reference Alignment** — depends on the Log to the extent alignment
  decisions need frame-level pitch rather than just a `PerformedNote`'s
  timing.
- **Metrics Engine** — the primary, motivating dependent (§7). Every
  phase-scoped metric in the parent doc's §4 needs it: `medianCents`,
  `meanAbsCents`, `centsSpread`, `attackCents`, `attackSettleSec`,
  `releaseCents`, `releaseDriftCents`, `confidence`, `reliableFraction`.
- **Mistake Classification** — depends on Metrics Engine's already-derived
  output, not on the Log directly. Named explicitly to close off a
  possible misreading of the pipeline diagram, which places it immediately
  after Metrics Engine.
- **Session Analysis, Progress Analysis** — explicitly do not depend on
  this document. Named to state the boundary, not because a dependency
  exists (§2, §8).

---

## 11. Consistency Review

Reviewed against `PERFORMANCE_ANALYSIS_ENGINE.md` and
`PERFORMED_NOTE_GENERATION.md` before writing §1–§10. Three things were
found: two places that already assume this object exists without naming
it, and one direct contradiction with a sentence already committed in
`PERFORMED_NOTE_GENERATION.md`. None are silently changed here.

**1. The parent doc already assumes this object, without naming it.**
[PERFORMANCE_ANALYSIS_ENGINE.md:576](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:576)
states, about raw frames: "Raw frames remain available in-session for
re-analysis." That sentence presumes some retained, queryable structure
exists — it just never says what it is called, who owns it, or how long it
lives. This document is the answer to a question the parent doc already
posed but left open. Nothing in the parent doc is changed; this document
fills a named gap in it.

**2. `PERFORMANCE_ANALYSIS_ENGINE.md`'s own metrics table assumes it too.**
Every phase-scoped row of §4 (`medianCents`, `attackCents`, `releaseCents`,
`confidence`, `reliableFraction`, `attackSettleSec`) requires per-frame data
restricted to a phase or an ordered window — data that cannot be
reconstructed from `PerformedNote` alone, since `PerformedNote` only stores
a frame *count* (`frames: number`), not frame *values*
([PERFORMED_NOTE_GENERATION.md:291](apps/sing-mvp/docs/PERFORMED_NOTE_GENERATION.md:291)).
This is exactly the gap the Performed Note review identified; this
document is the resolution the review deferred rather than decided on the
spot
([PERFORMED_NOTE_GENERATION.md §0.2](apps/sing-mvp/docs/PERFORMED_NOTE_GENERATION.md:61),
[§3](apps/sing-mvp/docs/PERFORMED_NOTE_GENERATION.md:326)).

**3. Direct contradiction — flagged, not silently resolved.**
[PERFORMED_NOTE_GENERATION.md:586](apps/sing-mvp/docs/PERFORMED_NOTE_GENERATION.md:586)
states: "No module depends on this one's internal `AnalysisFrame` shape —
that type does not cross this module's public boundary." That sentence was
correct as of that document, under the constraint that its module's output
was `PerformedNote[]` alone. It is no longer accurate now that the
Conditioned Frame Log is specified as a second output of that same module
(§3): Metrics Engine *does* depend on conditioned-frame data, and that data
does cross the boundary — just not through `PerformedNote`, and not through
a new public method invented here (this document specifies information
flow, not an interface). **This document does not edit that sentence.** It
states plainly that `PERFORMED_NOTE_GENERATION.md §10` needs a follow-up
correction — narrowing "no module depends on the internal `AnalysisFrame`
shape" to "no module depends on it *through `PerformedNote`*" — and that
`PERFORMED_NOTE_GENERATION.md §2`'s public interface will need an additive
extension (an accessor for the Log, alongside `completedNotes`) when this
document is adopted. Both are flagged as required follow-ups to an existing
document, not applied here, per this task's constraint against silently
modifying previous decisions.

**4. The task's own pipeline diagram draws Frame Conditioning and Performed
Note Generation as separate boxes.** Read literally, this could appear to
reopen `PERFORMED_NOTE_GENERATION.md §0.1`'s decision to package them as one
implementation module. It is not read that way here: the parent doc's own
architecture diagram
([PERFORMANCE_ANALYSIS_ENGINE.md:57-97](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:57))
already draws S1 and S2 as separate boxes while its own "Where it lives"
section co-locates their code in one feature slice
([PERFORMANCE_ANALYSIS_ENGINE.md:122-129](apps/sing-mvp/docs/PERFORMANCE_ANALYSIS_ENGINE.md:122)).
The diagram in this task's brief is treated the same way: a logical stage
diagram, not a module-boundary mandate. Un-merging Frame Conditioning back
into its own module would redesign Performed Note Generation's already-
decided boundary, which this task explicitly excludes ("Do not redesign
Performed Note Generation"). Practically, this reading is what makes §3's
ownership conclusion possible at all — the Log is produced by logic that
already lives inside the Performed Note Generation module, under its
Frame-Conditioning responsibility specifically.

**5. Naming continuity, not a conflict.** The task's pipeline names
"Session Analysis" and "Progress Analysis" as two distinct final stages.
This resolves, rather than conflicts with, a naming ambiguity in an earlier
review, where both were referred to loosely under a single brief-supplied
name. They map one-to-one onto the parent doc's S5 (Session Summary) and S6
(Multi-Session Analysis) respectively. Noted for traceability only.
