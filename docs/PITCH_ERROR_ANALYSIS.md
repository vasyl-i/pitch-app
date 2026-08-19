# Pitch Engine Error Analysis and Roadmap

Status: 2026-08-02. **Analysis only — no implementation was changed.**
Evidence: `npm run benchmark`, three detector configurations, 6139 scored frames.
Companions: [PITCH_BENCHMARK.md](PITCH_BENCHMARK.md), [PITCH_ENGINE_AUDIT.md](PITCH_ENGINE_AUDIT.md).

---

## 0. The missing input, stated first

**There are no real recordings.** `benchmark-corpus/real/` contains only its
README. This report therefore analyses the synthetic corpus, and three of the
eight requested categories cannot be quantified at all from it:

| Category | Status |
|---|---|
| Recording quality | **0 measurements.** Requires real audio by definition. |
| Annotation uncertainty | 0 frames affected today; bounded in advance (§7). |
| Note segmentation | **0 measurements**, for a different reason — see §5. |

What follows is not a smaller version of the real-corpus analysis. It is a
different analysis: the synthetic corpus bounds the *algorithm* against an exact
reference, and it is silent about the capture chain, the room and the microphone.
Where I give a user-impact estimate below, it is an estimate from algorithm
behaviour plus code inspection, not a measurement of users. Those are labelled.

---

## 1. Evidence base

| Configuration | Scored frames | Octave errors | Frames >12¢ | Frames >60¢ |
|---|---|---|---|---|
| `yin-11k-w512` (engine output) | 6139 | 118 (1.92%) | 191 (3.11%) | 19 (0.31%) |
| `yin-11k-w512-smoothed` (**what users get**) | 6139 | 122 (1.99%) | 275 (4.48%) | 24 (0.39%) |
| `yin-22k-w1024` (reference only) | 6139 | 20 (0.33%) | 132 (2.15%) | 19 (0.31%) |

Thresholds are the app's own display bands from `shared/lib/music.ts`
(`PERFECT_CENTS = 12`, `SLIGHT_CENTS = 30`, `NOTICEABLE_CENTS = 60`,
wrong-note = 120), so "frames >12¢" means *frames the app would colour as
something other than in-tune purely because of detector error*.

**The smoothed row is the user-visible one.** `createPitchSmoother` is applied
in all four listening features (staff practice, ear training, vocal range,
instrumental sing), so 4.48% — not 3.11% — is the rate at which the engine
mis-colours a frame on this corpus.

Corpus frequency is not user frequency: this corpus is deliberately adversarial
and contains material (above 1 kHz, 80% noise) that most users never produce.
Each category below separates the two.

---

## 2. Pitch detector limitation

**Corpus frequency: 133 frames, 2.17% of scored frames.** Three distinct
failures, all traced to analysis resolution rather than to logic:

| Failure | Frames | Behaviour |
|---|---|---|
| Above 1 kHz sub-harmonic lock | 93 (100% of that band) | reports exactly one octave low, every frame |
| 55 Hz degradation | 40 (100% of that case) | 12.61¢ constant error |
| High-band resolution loss | 38 of 403 high-band frames (9.43%) | >12¢ but correct octave |

The 55 Hz result is worth stating precisely because it is not a gradient: at
55 Hz every frame is 12.61¢ off; at 58.3 Hz the median is 0.13¢ and at 61.7 Hz
0.10¢. It is a cliff at the very bottom of the search range, not a slope. The
declared floor of 65 Hz is comfortably clear of it.

**User-visible impact — the highest-severity finding in this report.**
`isReliableF0` exists and is correct, and it is consumed in exactly **one**
place: `features/vocal-range/lib/guidedDetection.ts`. Staff practice, ear
training and instrumental sing never check it. So a singer who goes above C6 in
any practice mode gets a reading that is a full octave low, displayed with no
hedge — and because folded cents error stays under 9¢ up there, every downstream
quality signal reports the note as beautifully in tune. The engine is
confidently wrong, which is worse than being uncertain. Estimated exposure is
small (sopranos and falsetto only) but the consequence when it occurs is a
scored answer that is flatly incorrect.

**Smallest architectural change:** propagate the existing band check. `PitchFrame`
gains a `reliable: boolean` computed from `isReliableF0`, and the three features
that currently ignore it refuse to score frames where it is false. No DSP
algorithm changes, no new analysis, ~15 lines plus call sites. This does not fix
the detection — the fix for that is the 22 kHz configuration at 3.9x CPU — but it
converts a confident wrong answer into an honest absence, which is the correct
behaviour at the edge of a declared range.

---

## 3. Octave ambiguity

**Corpus frequency: 0 frames.** This is a negative result and it is worth
recording as one.

All 118 octave errors in the shipping configuration are accounted for by other
categories: 93 are the above-range resolution failure (§2) and 25 are the
80%-noise case (§4). The dedicated octave stress set — bright, dull, breathy,
breathy-bright and suppressed-fundamental timbres across five pitches, plus a
signal with its fundamental cancelled by 85% — produced **zero** octave errors.
Errors are also entirely one-directional (118 low, 0 high), consistent with
sub-harmonic locking rather than harmonic confusion.

**Impact: none.** **Smallest change: none. Do not touch the octave guard.** The
audit already rejected loosening it on evidence, and this analysis independently
confirms the guard is not the source of any measured error.

---

## 4. Insufficient confidence estimation

**Corpus frequency: 93 frames (1.51%) where confidence is blind to a real
failure**, plus a structural gap affecting all frames.

Measured behaviour of a gate at `CLARITY_MIN_RELIABLE = 0.8`:

| | Frames | Rejected by the gate |
|---|---|---|
| Bad frames (octave error or >60¢) | 119 | 26 (**21.8%**) |
| Good frames (right octave, ≤12¢) | 5848 | 10 (0.17%) |

The precision is excellent and the recall is poor, and the recall failure is not
random — it is systematic and exactly inverted from what is needed:

| Failure mode | Clarity (median) | Caught by a 0.8 gate |
|---|---|---|
| Above-range octave failure, MIDI 84 | 0.996 | 0 of 31 |
| Above-range octave failure, MIDI 86 | 0.951 | 0 of 31 |
| Above-range octave failure, MIDI 88 | 0.912 | 0 of 31 |
| 80%-noise breathy singing | 0.775 | 39 of 40 |

Confidence detects *breathiness*, which it was designed for, and is completely
blind to the octave failure — the detector is maximally confident precisely when
it is most wrong. Separately, the voice-versus-music result stands: the lowest
threshold that rejects a polyphonic mix also rejects 66.7% of genuine singing.

Structurally, no downstream module weights anything by confidence. The two call
sites that once gated on clarity were removed as no-ops, and nothing replaced
them, so a 0.74-clarity frame and a 1.00-clarity frame contribute equally to
every score in the app.

**User-visible impact:** in instrumental sing mode, backing-track bleed is scored
as if it were the singer, and clarity cannot prevent it. Across all modes, a
breathy or unstable frame carries the same weight in a phrase score as a clean
one, so scores are noisier than they need to be — most visibly at the ends of
phrases, where breath support fails and clarity genuinely drops.

**Smallest architectural change:** widen the frame contract rather than the
algorithm. `PitchFrame` carries a `PitchConfidence` object combining the existing
clarity with the existing band check and the existing RMS/noise-floor estimate —
all three already computed, none currently travelling together — and
`entities/exercise/evaluation.ts` weights each frame's contribution by it instead
of counting frames equally. This is the change that turns the §2 fix and this one
into the same fix, which is why they should be done together.

---

## 5. Note segmentation

**Corpus frequency: unmeasurable. Zero measurements exist.**

The harness measures frames; note events are never constructed, so onset error,
offset error and stable-note detection rate — three rows of the spec's own target
table — have never been measured at any point in this project. This is
simultaneously a segmentation gap and a benchmark limitation, and I have counted
it in both places deliberately because the fix differs.

Compounding it: a segmenter exists only inside ear training
(`features/ear-training/lib/capture.ts:135`). Staff practice and instrumental
sing grade raw frames against a fixed time grid, so for two of three practice
modes there is no note object to measure even in principle.

**User-visible impact: unknown, and that is the finding.** Note-level feedback —
"you came in late", "you held that note" — is currently produced by
`gradeNote`'s hard time windows, whose behaviour under real timing has never been
quantified. The related known defect is that a singer entering 200 ms late is
graded `wrong` or `missed` rather than `late`, because there is no alignment
layer.

**Smallest architectural change:** promote the ear-training segmenter to the DSP
layer as a `NoteSegmenter` emitting `DetectedNote`, and add onset/offset cases to
the corpus (the synthetic phrase generator already knows every note's exact start
sample, so the reference is free). Measurement must come before the alignment
work, or the alignment tolerance would be chosen by taste.

---

## 6. Preprocessing

**Corpus frequency: 0 frames measured.** The synthetic corpus feeds windows to
the detector at the analysis rate directly, so the FIR decimator is not in the
measured path for any number in §1. It is in the path only for real recordings,
via the `decimate.ts` replica — and there are no real recordings.

Known-good by prior measurement: DC removal (RMS inflation of up to 47% under
rumble, fixed and regression-tested). Unmeasured: decimation aliasing on bright
real material, buffer-boundary behaviour under live capture, and OS-level gain
handling.

**User-visible impact: unknown but bounded.** The decimator was already improved
once (boxcar → windowed-sinc FIR) specifically because aliasing was degrading YIN
on bright real mixes, which is evidence the path matters and evidence it has
never been measured.

**Smallest architectural change:** extract the FIR from `pitchEngine` into a
shared module — `benchmark/decimate.ts` is already a verbatim, drift-guarded copy
of it, so the extraction is mechanical — then render the synthetic corpus at
44.1 kHz and run it through the real decimator. That single change closes the
largest measurement gap in the harness and deletes the replica.

---

## 7. Recording quality

**Corpus frequency: 0 measurements. Blocked on real recordings.**

Nothing about clipping, automatic gain control, room reverberation, preamp noise
floor or microphone response has been measured. `pitchEngine` detects clipping
and sets a `clipped` flag, and no corpus case has ever exercised it.

**Estimated impact: unknown, plausibly the largest of any category.** Every
number in this report describes an algorithm operating on clean signals. The one
piece of indirect evidence is unflattering: the shipping smoother measurably
*worsens* display accuracy on synthetic material (§8), and the only reason to
keep it is a real-world noise condition this corpus cannot produce.

**Smallest architectural change:** none — this is not an architecture problem. It
is the stage-1 recording task already specified in
[benchmark-corpus/real/README.md](../benchmark-corpus/real/README.md).

---

## 8. A finding without a category: pitch stabilisation

The eight categories have no slot for post-detector stabilisation, and the
measurements put a real failure there.

Comparing the raw engine against the smoothed configuration users actually get:

| Metric | Raw | Smoothed | Change |
|---|---|---|---|
| Frames >12¢ | 3.11% | 4.48% | **worse** |
| Frames >60¢ | 0.31% | 0.39% | worse |
| Octave errors | 118 | 122 | worse |
| Median settling | 41.2 ms | 52.8 ms | +11.6 ms |
| Core-band jitter | 0.52¢ | 0.58¢ | no gain |

The smoother introduces five new failing cases that do not exist in the raw
engine — `material-major-c4` (63¢ worst), `material-minor-a3` (67¢),
`material-legato-c4` (87¢), `material-female-a4` (62¢) and `material-jumps-c4`
(306¢, with 0.3% octave errors) — all on scale and legato material. That is the
`SNAP_SEMITONES = 2` boundary behaving as designed: intervals below the snap
threshold are glided through, so the reported pitch passes through notes the
singer never sang.

**This is not yet a reason to change the smoother.** It exists for microphone
noise the synthetic corpus does not contain, and removing it on this evidence
would be exactly the mistake this whole benchmark was built to prevent. It is a
reason to (a) add `pitch stabilisation` to the failure taxonomy, and (b) treat
"does the smoother earn its 11.6 ms" as the first question the real corpus is
asked.

---

## 9. Annotation uncertainty

**Frames affected today: 0** — no real corpus. Bounded in advance by measurement:

- pYIN on clean steady tones: ≤0.02¢ error. On sustained material the annotator
  floor is negligible.
- On vibrato'd material: 1.27¢ of disagreement versus 0.39¢ for the identical
  phrase sung straight. pYIN's Viterbi smoothing lags real pitch movement.
- No filter can recover the difference, because every filter consults the
  annotation and the annotation is what was smoothed.

**Impact when the corpus exists:** it caps resolvable detector error on moving
material at roughly 3–4¢, which is above three of the six bands' entire measured
error. Already handled architecturally by the `sustained`/`expressive` category
split, the steady-frame filter and the trusted/untrusted separation.

**Smallest change: none.** This is done.

---

## 10. Benchmark limitation

**The largest category by unmeasured surface.** Five rows of the spec's target
table have never been measured, and two more cannot be measured off-device:

| Unmeasured | Blocked on |
|---|---|
| Note onset / offset error | a `NoteSegmenter` (§5) |
| Stable-note detection rate | the same |
| Capture chain and decimation | pipeline extraction (§6) |
| Real voices, rooms, microphones | recordings (§7) |
| On-device CPU / real-time factor | a device-side runner |
| Memory, UI frame rate | not instrumented anywhere |
| Android, Bluetooth routes | a device matrix |

Every CPU number in this report is laptop V8. Hermes runs this pipeline roughly
50x slower — the measured reason the engine decimates 4x at all — so the reported
0.56% real-time factor tells us nothing about a phone.

---

## 11. Prioritized roadmap

Ordered by measured evidence per unit of risk. Nothing here is implemented.

| # | Change | Category | Evidence | Cost | Risk |
|---|---|---|---|---|---|
| 1 | Propagate `isReliableF0` into `PitchFrame`; the three ungated features refuse out-of-band frames | detector limitation | 93 frames confidently wrong, 0 caught by confidence, 1 of 4 features guarded | ~15 lines + call sites | very low |
| 2 | Record the stage-1 sustained set | recording quality | 0 of 8 categories have real evidence | owner time | none |
| 3 | Extract the decimator; render the synthetic corpus at 44.1 kHz through it | preprocessing | 0% of the capture chain measured; replica already written and drift-guarded | mechanical | low |
| 4 | `PitchConfidence` object + confidence weighting in evaluation | confidence | 21.8% recall today; nothing downstream weights by it | moderate | medium |
| 5 | `NoteSegmenter` + onset/offset corpus cases | segmentation | 3 target-table rows never measured; 2 of 3 modes have no note object | moderate | medium |
| 6 | Device-side CPU runner | benchmark | every CPU number is laptop V8 | ~150 lines | low |
| 7 | Re-evaluate the smoother against the real corpus | stabilisation | worse on every synthetic metric; justified only by noise this corpus lacks | analysis | none |
| 8 | Re-price the 22 kHz configuration | detector limitation | removes the >1 kHz failure entirely, 3.9x CPU — decide after #6 | decision | none |

Items 1 and 3 are the only ones whose evidence is strong enough to act on
immediately. Item 1 is the single highest-value change in the list: it costs
almost nothing, needs no algorithm work, and converts the report's most severe
failure from a confident wrong answer into an honest absence.

Items 4, 5 and 7 should wait for item 2. Their evidence is currently synthetic,
and §8 is a worked example of how misleading that can be.

---

## 12. What the real corpus changes

Categories that stay unmeasurable without it: recording quality (entirely),
stabilisation (§8 cannot be resolved), and the real-world half of confidence
estimation. It would also give the first evidence about whether the failures
above occur at rates users encounter, rather than at rates an adversarial
synthetic corpus produces.

Categories it will *not* resolve: note segmentation needs a segmenter before it
needs recordings, and the >1 kHz failure is a resolution limit that no recording
will change.
