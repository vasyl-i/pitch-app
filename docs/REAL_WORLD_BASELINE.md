# Real-World Baseline — VocalSet Long Tones

Status: 2026-08-02. **DSP pipeline unchanged.** Only benchmark infrastructure
was modified, and only where the integration exposed a defect (§2).
Companions: [PITCH_BENCHMARK.md](PITCH_BENCHMARK.md),
[PITCH_ERROR_ANALYSIS.md](PITCH_ERROR_ANALYSIS.md),
[BENCHMARK_CORPUS_DATASETS.md](BENCHMARK_CORPUS_DATASETS.md).

This is the first measurement of the production pitch pipeline on real human
singing.

---

## 1. What was integrated

100 recordings from VocalSet — `FULL/<singer>/long_tones/straight/` — every one
of the 20 professional singers, five vowels each. CC BY 4.0, and already
44.1 kHz mono, the pipeline's exact capture rate, so nothing was resampled.

They are `category: sustained`: deliberately straight long tones are the only
material from which the harness will derive an accuracy figure. Each file holds
several sustained pitches, so 100 files cover far more range than 100 notes
would — five of six operating bands, including `low` and a little above 1 kHz.

Ingested with `scripts/ingest_vocalset.py`, which reuses `annotate_vocal.py`'s
conversion and annotation path so the corpus cannot diverge from what
owner-recorded material would produce.

Annotations are pYIN and **unverified**. No human has listened to a
sonification, so by this project's own rule these support tracking metrics but
cannot underwrite an accuracy claim. Every number below inherits that caveat.

---

## 2. Four infrastructure defects the integration exposed

All four were invisible against synthetic material and all four are fixed. No
DSP algorithm was touched.

### 2.1 The annotator's grid was coarser than the thing being measured

librosa's `pyin` defaults to `resolution=0.1`, which is 0.1 **semitone** — a
10-cent grid. Measured on the first ingest: every adjacent distinct f0 value
differed by exactly 10.000 cents, and the pipeline's apparent median error came
out at 3.3¢ — almost exactly the 2.9¢ RMS noise a 10-cent uniform grid produces
on its own.

**The benchmark was measuring the annotator's rounding.** This is the single
most consequential finding of the integration, and it would have silently
capped every real-corpus accuracy number this project ever produced.

Fixed by annotating at `resolution=0.02` (2-cent grid, 0.58¢ RMS), with the
floor written into each recording as `annotatorErrorCents` so the harness
reports what it cannot resolve.

### 2.2 A fine grid over the full search range is unaffordable

pYIN's cost grows steeply with bin count, and bins span `fmin..fmax`. At 1 cent
over 55–1400 Hz that is 5600 bins and ~6 minutes per file — 10 hours for this
corpus.

Fixed with a two-pass annotation: a cheap coarse pass finds the range a
recording actually uses, then the fine pass searches only that range padded by
a fifth. Measured: 6 min → 38 s per file. The padding is deliberately generous
so the fine pass can still disagree with the coarse pass about octaves.

### 2.3 The synthetic budget was being applied to real recordings

`checkBudget` pooled real cases into `SHIPPING_BUDGET`, whose every limit was
derived from synthetic material. The first ingest failed `falsePitchRate` at
11% purely because real recordings contain breath and silence that the
synthetic corpus does not — the budget had no opinion about that because it
could not have. The check is now synthetic-only; real limits belong in
`REAL_CORPUS_BUDGETS`, to be recorded once the corpus is trusted.

### 2.4 The synthetic regression gate moved when the corpus grew

Real-corpus results were being folded into the committed baseline, so 36 values
"moved" without a line of pipeline code changing. A gate that cries wolf on
corpus growth is one people learn to re-record without reading. The synthetic
baseline is now synthetic-only, and real results go to a separate
`baselines/real-<config>.json` which is *expected* to move.

### 2.5 (minor) The mislabel warning drowned the report

The "declared sustained but doesn't hold still" check fired for all 100
recordings and buried every other line. Now summarised, with an explicit note
that a check firing for everything points at the threshold or the annotation
rather than at the singing — which is exactly what it turned out to mean here.

---

## 3. What the steadiness threshold turned out to mean

`STEADY_SPREAD_CENTS = 2` was calibrated on synthetic signals, where a
sustained tone is flat to a fraction of a cent. On the first real ingest it
admitted 96 frames out of 66,473 — 0.14% — and the harness correctly refused to
publish an accuracy figure from them.

Measuring the contour-spread distribution of real straight-tone singing over a
400 ms neighbourhood gave a median of 20¢, with thresholds of 2, 3, 5 and 8¢ all
admitting exactly the same 0.4% of frames. That flatness across four thresholds
was the tell: the spread was quantized because *the annotation* was quantized,
in 10-cent steps. The threshold was being compared against the annotator's grid,
not against the singing.

The correct order of operations is therefore: fix the annotation resolution
first, then re-measure the spread distribution, and only then decide whether the
threshold needs to move.

Re-measured on the corrected annotation, detector error against the annotation
is **flat across every spread bin from 5¢ to 20¢** (1.59–1.96¢) and only climbs
beyond that (3.58¢ at 35–60¢, 5.24¢ at 60–100¢). The knee is at ~20¢, so the
threshold is now **12¢** — the floor of that curve, retaining 27.5% of frames.
It also has a self-correcting guard: a threshold finer than the annotation's own
grid step can never be satisfied, so the effective value is raised to twice the
grid when necessary.

That flat curve matters for a second reason. It means restricting to the
flattest frames is *not* cherry-picking easy ones on this corpus — the
selection-bias worry that motivated the original warning does not bite here.

### A finding this corrected

The earlier claim that vibrato costs **3.74¢** of annotator disagreement against
0.39¢ for straight singing was largely an artefact of the 10-cent grid.
Re-measured on the identical phrases with the corrected annotator: **1.27¢ vs
0.39¢**. The effect is real and still ~3x, but it is small in absolute terms and
sits below the 1.44¢ annotation floor. Every document and code comment citing
3.74¢ has been updated, and the unit test that pinned the old belief — which
asserted a ±7¢ wobble must be excluded — now uses a realistic ±40¢ vibrato,
because shallow drift is legitimately scorable.

---

## 4. The real-world baseline

`yin-11k-w512`, 100 recordings, 65,555 scored frames. **Annotations unverified**
(§6).

### Pitch accuracy by vocal range

Sustained subset — 12,684 frames, the only material from which the harness will
derive an accuracy figure.

| Band | Median | p95 | Max | ≤10¢ | Floor-corrected median | Synthetic, same band |
|---|---|---|---|---|---|---|
| low (65–130) | 1.65¢ | 4.25¢ | 7.3¢ | 100% | ~0.8¢ | 0.13¢ |
| mid (130–330) | 1.71¢ | 5.04¢ | 54.7¢ | 99.6% | ~0.92¢ | 0.28¢ |
| upper-mid (330–660) | 1.62¢ | 4.75¢ | 11.3¢ | 100% | ~0.75¢ | 0.91¢ |
| high (660–1000) | 1.97¢ | 5.16¢ | 9.0¢ | 100% | ~1.35¢ | 1.65¢ |

"Floor-corrected" subtracts the 1.44¢ annotation floor in quadrature. It assumes
independence and is indicative, not exact.

**The headline: real-world accuracy is roughly 0.8–1.4¢, against 0.28¢ on
synthetic material in the core band — a 3–5x degradation, and still far inside
the app's 12¢ "in tune" threshold.** Accuracy is not the problem. Everything
below is.

### Octave failures

| Band | Octave error rate | Synthetic |
|---|---|---|
| low | 0.33% | 0% |
| mid | 1.78% | 0% |
| **upper-mid** | **4.78%** | 0% |
| high | 0.00% | 0% |
| above-range | 4.91% | 100% |

**2.41% overall, against 0% in-band on synthetic material.** Two things make
this the most surprising result in the report:

1. **The direction is reversed.** 1,149 of 1,578 are octave-*high*; the
   synthetic failure was 100% octave-low. Sub-harmonic locking is what the
   synthetic corpus produces; real voices provoke harmonic locking instead —
   the detector picks the second harmonic as the fundamental. The octave guard
   was measured as flawless on synthetic timbres and is not catching this.
2. **The worst band is upper-mid (330–660 Hz)** — the middle of the range, where
   the synthetic corpus says the detector is near-perfect. Not an edge case.

**Caveat, and it is a big one.** 97% of all octave disagreement sits in 18 of
100 recordings, and the annotation is unverified pYIN. Concentration like that
is more consistent with the *annotator* being octave-wrong in specific files
than with the detector failing randomly. This number cannot be trusted until
those 18 recordings are hand-verified — that is the single highest-value
follow-up in this report. The 18 are listed in the analysis output; the worst
are `male7-a` (45.5%), `male5-e` (27.0%), `female9-a` (23.9%).

### Confidence behaviour

| | Real | Synthetic |
|---|---|---|
| Bad frames caught by a 0.8 clarity gate | **0.81%** (13 of 1,611) | 21.8% |
| Good frames wrongly rejected | 0.12% | 0.17% |
| Median clarity on bad frames | **0.911** | 0.78–1.00 |
| Median clarity on good frames | 0.990 | — |

**On real singing, confidence is very close to useless as a correctness
signal.** It catches under 1% of failures, and the median clarity of a failing
frame is 0.911 — comfortably inside what the app calls reliable. The synthetic
corpus flattered it: there, breathiness was the dominant failure and clarity is
a breathiness detector. On real voices the dominant failure is octave locking,
which produces a *strongly periodic* signal and therefore high clarity.

This turns the earlier roadmap item from "confidence has poor recall" into
"confidence cannot be the mechanism". Frame weighting by clarity would weight
almost every bad frame at full strength.

### Tracking stability

| Metric | Real | Synthetic |
|---|---|---|
| Note flips/s, median | **3.57** | 0.00 |
| Note flips/s, p95 | 10.02 | 0.00 |
| Note flips/s, max | 14.74 | 0.00 |
| Jitter, median | 4.88¢ | 0.52¢ |
| Jitter, p95 | 28.61¢ | — |

**This is the most user-visible failure in the report.** On *deliberately
straight, sustained* professional singing, the displayed note name changes 3.6
times per second at the median and up to 15 times per second at the worst. The
synthetic corpus reported exactly zero flicker and gave no hint this existed.

The app's own quality philosophy names this specific failure — a detector that
is technically accurate while flickering between note names harms the learner
more than the error it fixes. It is now measured, on real voices, at the rate a
user would actually experience.

### Latency

| Measure | Real | Synthetic |
|---|---|---|
| Settling at note transitions, median | **151.0 ms** | 41.2 ms |
| p95 | 556.8 ms | 52.8 ms |
| Analytic floor (window + hop) | 58.0 ms | 58.0 ms |

Measured at 181 real note transitions found in the annotation contour, rather
than at synthetic pitch steps. **3.7x the synthetic figure and 2.6x the analytic
floor.** A real singer does not step between pitches instantaneously — they
slide, and the detector tracks the slide — so part of this is the singer and not
the engine. But it is what the app experiences, and the p95 of half a second is
long enough to be felt as lag in live feedback.

### Note segmentation quality

Derived by segmenting both the annotation contour and the detector output with
the app's own rules (0.8 semitone break, 250 ms gap, 150 ms minimum) and
matching by overlap. **The harness still has no segmenter — this is analysis
code, not a new pipeline stage.**

| Measure | Value |
|---|---|
| Annotated notes | 341 |
| Detector notes | 371 |
| Matched | 281 (82.4%) |
| Onset error, median / \|median\| | +20.2 ms / 20.8 ms |
| Onset error, p95 \|.\| | **807 ms** |
| Offset error, median / \|median\| | −46.9 ms / 47.2 ms |
| Offset error, p95 \|.\| | **1610 ms** |
| Fragmentation | 1.09 detector notes per annotated note |

Median onset error of 21 ms is good — comfortably inside the spec's 80 ms MVP
target. The p95 of 807 ms is not, and neither is the 17.6% of annotated notes
that never matched a detector note at all. The distribution is bimodal: most
notes are found promptly, and a minority are missed or merged badly. An average
would have hidden that completely.

### User-visible failure patterns

Mapped onto the app's own display thresholds, so each row is "frames the app
would colour wrongly because of the engine".

| | Raw engine | **Smoothed (what users get)** |
|---|---|---|
| >12¢ — not shown as "in tune" | 3.78% | **20.11%** |
| >30¢ — not shown as "slight" | 0.26% | 4.39% |
| >60¢ — "noticeable" | 0.09% | 0.47% |
| >120¢ — "wrong note" | 0.04% | 0.09% |
| Lost voice (singing, no reading) | 2.50% | 2.50% |
| False pitch (silence, reading) | 0.29% | 0.29% |

**One in five displayed frames is mis-coloured in the configuration users
actually run.** The smoother that produces this is applied in all four listening
features.

---

## 5. The smoother is the biggest single finding

The synthetic corpus suggested the median-3 + EMA smoother was mildly
unhelpful — 3.11% → 4.48% mis-coloured frames — and the honest conclusion at the
time was that the corpus lacked the microphone noise the smoother exists for. The
real corpus answers that.

| Metric | Raw | Smoothed | Change |
|---|---|---|---|
| Frames >12¢ | 3.78% | **20.11%** | **5.3x worse** |
| Frames >30¢ | 0.26% | 4.39% | 17x worse |
| Median error, mid band | 2.48¢ | 5.21¢ | 2.1x worse |
| Jitter, median | 4.88¢ | 13.01¢ | 2.7x worse |
| Settling, median | 151.0 ms | 158.4 ms | +7 ms |
| Octave errors | 2.41% | 2.23% | 7% better |
| **Note flips/s, median** | **3.57** | **2.99** | **16% better** |

The smoother buys a 16% reduction in note flicker and pays for it with five
times the mis-coloured frames, nearly three times the jitter, and doubled median
error. On real human singing the EMA is simply lagging: a real voice is always
drifting slightly, so a smoother tuned to suppress synthetic jitter spends its
time behind the signal.

**This is now an evidence-backed candidate for removal or retuning** — and it is
exactly the question that could not be answered before real recordings existed.
It is still a DSP change and is not being made here.

---

## 6. What this baseline cannot support

- **Annotations are unverified.** No human has listened to a sonification. The
  octave figures in particular are suspect (§4), and until the 18 concentrated
  recordings are checked, 2.41% is an upper bound on detector octave error, not
  a measurement of it.
- **The annotation floor is 1.44¢.** Detector error below that is not resolvable.
  Re-annotating at `resolution=0.02` costs ~38 s/file and drops the floor to
  0.58¢; worth doing before any accuracy figure is defended rather than surveyed.
- **One dataset, one recording condition.** VocalSet is studio-recorded
  professional singing. No phone microphones, no rooms, no background noise, no
  automatic gain control, no amateur voices. The conditions most likely to break
  the engine in production are still unmeasured.
- **Long tones only.** No scales, no legato, no vibrato, no fry. The `expressive`
  category is still empty.
- **`sub-low` remains uncovered** — no frames below 65 Hz.

---

## 7. What changed in the roadmap

Against [PITCH_ERROR_ANALYSIS.md](PITCH_ERROR_ANALYSIS.md) §11, measured on real
voices:

| # | Item | Status after this baseline |
|---|---|---|
| 1 | Propagate `isReliableF0` | **Unchanged and still correct.** 0.72% of real frames are out-of-band readings, 261 of them octave-wrong. |
| 4 | Confidence weighting | **Downgraded.** Clarity catches 0.81% of real failures. Weighting by it would achieve almost nothing; the mechanism needs rethinking, not wiring. |
| 5 | `NoteSegmenter` | **Upgraded.** Now has real numbers to hit: 82.4% match, p95 onset 807 ms, 1.09 fragmentation. |
| 7 | Re-evaluate the smoother | **Upgraded to the top of the list.** 20.11% of user-visible frames mis-coloured, against 3.78% raw. |
| — | *New:* verify the 18 octave-disagreement recordings | Highest-value follow-up; gates whether the 4.78% upper-mid figure is real. |
| — | *New:* note flicker at 3.57/s on straight singing | Previously invisible; the most user-visible defect measured so far. |

Suggested order now: **verify the 18 recordings** → **smoother re-evaluation**
→ `isReliableF0` propagation → segmenter. The first is analysis, the second is
the largest measured user-visible win, and neither of the last two changed.

