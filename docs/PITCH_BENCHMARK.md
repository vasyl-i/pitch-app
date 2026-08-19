# Pitch Detection Benchmark

Status: baseline recorded 2026-08-01
Harness: `src/features/pitch-detection/benchmark/`
Run: `npm run benchmark` · CI gate: `npm run benchmark:check`

This document does two things: it describes the measurement harness, and it
replaces the global performance constants in *Engineering Requirements Part 1*
with requirements that are stated per operating range and per detector
configuration, because that is what the measurements support.

**No DSP code was changed to produce any number here.** The harness observes the
shipping detector through a narrow seam and nothing in `lib/` imports it.

---

## 1. Why the global targets were replaced

Part 1 stated pitch accuracy, octave error rate and latency as single figures
for the whole system (`±8 cents`, `<1%`, `<60 ms`). Measurement does not support
a single figure for any of the three:

- **Accuracy varies ~20x across the range.** The same code measures 0.28¢ median
  in the core of the voice and 1.65¢ at the top, with the p95 moving from 1.2¢ to
  12.3¢. A single number is either a lie about the top of the range or a
  uselessly loose bound on the middle of it.
- **Octave error is not a rate, it is a cliff.** Below 1 kHz it is 0%. Above
  1 kHz it is 100% — the detector locks onto the sub-harmonic and reports exactly
  one octave low, every frame. Averaging those into "<1%" would describe a
  failure mode that does not exist while hiding one that does.
- **Latency is three different quantities.** Window fill (46.4 ms) is fixed by
  the analysis window; hop quantization (11.6 ms) by the frame rate; response
  settling (41.2 ms measured) by the algorithm. They add differently, and one of
  them is not reducible without changing the low-frequency limit.

So each requirement below names the band and the configuration it applies to. A
number without both is not a requirement, it is a slogan.

---

## 2. Requirements, benchmark-driven

For configuration `yin-11k-w512` — YIN at an 11.025 kHz analysis rate, 512-sample
window, 128-sample hop, which is what the app ships.

| Operating range | Median abs. error | p95 abs. error | Octave error | Lost voice | Jitter | Note flicker |
|---|---|---|---|---|---|---|
| below 65 Hz | ≤ 2¢ | ≤ 20¢ | ≤ 0.1% | ≤ 1% | — | — |
| 65–130 Hz | ≤ 1.5¢ | ≤ 8¢ | ≤ 0.1% | ≤ 1% | ≤ 2.5¢ | ≤ 0.5/s |
| 130–330 Hz | ≤ 1¢ | ≤ 3¢ | ≤ 0.1% | ≤ 1% | ≤ 2¢ | ≤ 0.5/s |
| 330–660 Hz | ≤ 2¢ | ≤ 6¢ | ≤ 0.1% | ≤ 1% | ≤ 2¢ | ≤ 0.5/s |
| 660–1000 Hz | ≤ 4¢ | ≤ 20¢ | ≤ 0.1% | ≤ 1% | ≤ 3¢ | ≤ 0.5/s |
| above 1000 Hz | — | — | **≥ 90%** (pinned failure) | — | — | — |

Whole-corpus: false pitch on unvoiced material ≤ 0.1%; median settling ≤ 80 ms;
processing ≤ 50% of the hop it must fit inside.

Three things about this table:

1. **Every limit is a measured value with headroom**, not a goal. The measured
   values are in `benchmark/baselines/`; these are the alarms, that is the
   record. Improving the detector should *break* this table — read the diff and
   tighten it deliberately.
2. **The last row is a maximum expressed as a minimum.** Above the declared
   ceiling the detector must *keep* failing, because `MAX_RELIABLE_F0`, the
   vocal-range detector's out-of-band refusal and the range filter in
   instrumental sing all depend on that band being untrustworthy. A silent fix
   would leave those three lying about the engine.
3. **Cents error is octave-folded and octave errors are counted separately.**
   Mixing them produces a meaningless number: one octave error contributes
   1200¢ and drags a whole band's mean past every other frame in it.

---

## 3. Measured baseline

`yin-11k-w512`, 85 cases, 6706 frames, 6139 scored.

| Band | Median | p95 | Max | ≤10¢ | ≤25¢ | Octave err | Jitter | Flicker |
|---|---|---|---|---|---|---|---|---|
| sub-low | 0.21¢ | 12.61¢ | 12.61¢ | 66.7% | 100% | 0% | 0.13¢ | 0/s |
| low | 0.13¢ | 5.31¢ | 19.47¢ | 98.2% | 100% | 0% | 1.08¢ | 0/s |
| mid | 0.28¢ | 1.17¢ | 13.45¢ | 99.4% | 100% | 0% | 0.52¢ | 0/s |
| upper-mid | 0.91¢ | 2.80¢ | 9.11¢ | 100% | 100% | 0% | 0.61¢ | 0/s |
| high | 1.65¢ | 12.27¢ | 13.98¢ | 89.7% | 100% | 0% | 0.95¢ | 0/s |
| above-range | 5.19¢ | 8.29¢ | 8.63¢ | 100% | 100% | **100%** | 0.35¢ | 0/s |

**Latency**

| Component | Value |
|---|---|
| Window fill | 46.4 ms |
| Hop quantization | 11.6 ms |
| Analytic floor (window + hop) | 58.0 ms |
| Measured settling, median over 6 pitch steps | 41.2 ms |
| Measured settling, octave leap | 52.8 ms |
| Processing per frame | 0.065 ms mean (0.56% of the hop) |

**Confidence**

| Measure | Value |
|---|---|
| Clarity, accurate-frame AUC | 0.891 |
| Clean voice / breathy voice / polyphonic mix, median clarity | 0.999 / 0.859 / 0.983 |
| Threshold that rejects the mix | 0.986 |
| Genuine singing that threshold also rejects | **66.7%** |

---

## 4. What the first run established

**Settling beats the analytic floor.** Response to a pitch step is 41.2 ms,
below the 58.0 ms window-plus-hop floor. YIN locks onto the new period from a
partially refreshed window rather than waiting for a clean one. Latency
requirements should therefore be stated against measured settling, not derived
from the window size — deriving them would have overstated the app's latency by
40%.

**The clarity gate has a price tag now.** The audit established that clarity
cannot separate a singer from a backing track. The harness quantifies it: the
lowest threshold that rejects every polyphonic-mix frame (0.986) also rejects
66.7% of genuine singing, because breathy singing (0.859) sits *below* the
chord (0.983). Note that the ranking AUC for voice-vs-music is 1.000 — perfect
separation — which is exactly why AUC must never be quoted alone. Ranking
separability and threshold separability are different questions, and only the
second one matters to a gate.

**The high-rate configuration eliminates the ceiling failure.** `yin-22k-w1024`
takes above-range octave errors from 100% to 0% and improves median accuracy
roughly 3x in every band (high band 1.65¢ → 0.57¢), at 3.9x the CPU
(0.065 → 0.251 ms/frame). The audit rejected this on the reasoning that the
affected population did not justify ~4x CPU. That reasoning is unchanged, but it
is now a priced trade rather than an estimate, and it can be re-priced when
someone asks about the ceiling again. Note the low band gets *worse* at the
higher rate (p95 5.31¢ → 11.49¢) — unexplained, and worth understanding before
anyone acts on this row.

**The smoother is not currently earning its latency.** `yin-11k-w512-smoothed`
adds 11.6 ms of settling (41.2 → 52.8 ms), leaves core-band jitter unchanged
(0.52¢ → 0.58¢), and makes high-band accuracy slightly worse (1.65¢ → 2.27¢). It
also introduces two new octave-error outliers on large interval leaps, which is
its snap-versus-glide threshold behaving as designed. **Do not act on this
yet:** the corpus is synthetic and has no real microphone noise, which is the
condition the smoother exists for. This finding is a statement about the corpus
as much as about the smoother, and it is the strongest argument for the
real-vocal corpus task.

---

## 5. The real-vocal corpus

Built 2026-08-02. **No recordings are installed yet** — the ingestion path, the
annotation tooling and the integration are complete and tested; the audio is
the outstanding part.

Drop `<id>.wav` + `<id>.json` pairs into `benchmark-corpus/real/` (outside
`src/`, so Metro never bundles them) and they are measured automatically.
An absent or empty corpus is a normal state, not an error.

```bash
python3 scripts/annotate_vocal.py take01.m4a --id male-chromatic-quiet \
  --source "…" --license "…" --consent "…" --sonify
```

The script converts to the pipeline's 44.1 kHz capture format, annotates the f0
contour with pYIN, and writes the pair. `--sonify` writes a verification file —
your voice left, the annotated pitch as a sine right — because the script always
writes `"verified": false` and only a human listening may change it. See
[benchmark-corpus/real/README.md](../benchmark-corpus/real/README.md) for the
recording protocol and the band-coverage targets.

### Cents accuracy is only meaningful on sustained material

This is the rule the corpus design turns on, and it was measured rather than
assumed. Scoring the detector against a pYIN contour of a vibrato'd phrase gives
**3.74¢** median error. Regenerating the identical phrase without vibrato — same
material, same annotator, same exclusion rate — gives **0.39¢**. Neither
detector is wrong by 3.4¢: pYIN applies Viterbi decoding across frames, so its
contour lags and flattens real pitch movement, and comparing two contours of
moving pitch measures that gap.

Two attempts were needed to encode this correctly, and the first one's failure
is worth keeping:

1. A **window-local** flatness test moved 3.74¢ only to 3.50¢. The disagreement
   is temporal, not within-window, so a window-local test cannot see it.
2. A **neighbourhood** test (contour flat for a vibrato period either side) at a
   10¢ threshold still admitted the case — because a ±7¢ contour has a spread of
   7 from its median, under the bar. Even that shallow a movement, below the
   app's own 15¢ vibrato floor, carried 3.5¢ of disagreement.

The threshold is now 2¢ over a ±200 ms neighbourhood. On continuously vibrato'd
material it correctly yields **zero** sustained frames, and the report refuses to
print an accuracy figure, warning instead. There is a deeper reason no filter
can do better: every filter must consult the annotation, and the annotation is
what was smoothed — so a flatness test preferentially keeps the frames where the
annotator flattened movement most, which are the frames a movement-tracking
detector disagrees with hardest. The fix is a *recording* instruction, not an
algorithm: **take deliberately straight, sustained notes if you want an accuracy
number from real voices.**

The report prints two tables accordingly — sustained frames for accuracy, all
scored frames for voicing, dropouts and octave errors, where a contour
annotation is authoritative.

### Two enforced categories

Every recording declares `category`, and the declaration governs what it may be
used for. `sustained` — deliberately straight held notes — is the **only** basis
for accuracy figures. `expressive` — vibrato, slides, phrasing, scales — is
measured for tracking and robustness and never contributes to an accuracy
number, however still parts of it happen to be. Two gates apply to the accuracy
subset (declared sustained *and* measuring sustained), because the declaration
alone is intent and the measurement alone would admit whichever fraction of
expressive material the annotator smoothed flattest. `expressive` is the
ingestion default, so accuracy contribution is opt-in, and a take declared
`sustained` that wobbles is named in the report for re-recording.

### Terminology

The word "ground truth" is not used for real recordings. Their reference is an
**automatic annotation** produced by pYIN — another pitch detector, with its own
error and its own temporal smoothing. Only the synthetic corpus has a reference
that is exact, and it is exact *by construction*: those signals are synthesized
from a known pitch rather than measured. The shared abstraction is
`PitchReference`, which claims neither.

### Other guardrails

- **Provenance is mandatory.** `source`, `license` and `consent` are required and
  the loader rejects a recording without them. A benchmark corpus is exactly the
  kind of thing that accumulates unaccountable audio, and this project has a
  documented legal boundary around vocal material.
- **Audio lives in Git LFS**, annotations and metadata in the main repository —
  see [`.gitattributes`](../.gitattributes). LFS must be installed and tracking
  before the first audio commit; it does not capture files retroactively.
- **Trusted and untrusted annotations are never pooled.** `pyin` output is an
  estimate from another detector; `egg`, `synthesized-source`, `manual` and
  human-verified pYIN are reference-grade. The report counts each.
- **The exclusion rate is reported next to every result it affects**, because
  excluding awkward windows is both necessary and the easiest way to make a
  detector look good.
- **Real bands are frame-level.** A recording crosses several bands, so its
  frames are banded by expected pitch. Synthetic cases stay case-level, since a
  synthetic case holds one pitch by construction.
- **Real budgets are deliberately empty** ([budgets.ts](../src/features/pitch-detection/benchmark/budgets.ts)).
  Real-corpus error is detector error plus annotator error, and the second term
  is unknown until a corpus exists. Fill them in from the first run over
  verified recordings.

## 6. Coverage boundaries

Stated plainly, because a benchmark's credibility depends on what it admits it
does not cover.

- **Decimation is now in the path for real recordings, via a replica.** Real
  audio arrives at 44.1 kHz and must be decimated to 11.025 kHz, and the engine's
  FIR is a module-private constant that cannot be imported. `benchmark/decimate.ts`
  is a verbatim copy, and a test compares the two source blocks character for
  character after whitespace normalization; a second test proves offline
  whole-file decimation is identical to the engine's chunked callback path.
  **This module is scaffolding** — the pipeline-extraction task should delete it
  and have both callers share one decimator.
- **The `AudioRecorder` callback is still not measured**: real capture jitter,
  buffer underruns and OS-level gain handling remain outside these numbers.
- **The synthetic corpus remains synthetic**, which is what makes its ground
  truth exact. It cannot produce glottal fry, room reverberation, consonant
  transients or a real preamp's noise floor — that is what the real corpus is
  for, and until recordings exist those conditions are unmeasured.
- **No Android or Bluetooth coverage.** Unchanged from the audit; needs a device
  matrix, not desk work.
- **`processingMs` is machine-dependent** and excluded from the baseline
  comparison. It is reported because CPU cost is real, and budgeted only loosely
  enough to catch an accidental complexity regression.

---

## 7. Using the harness

```bash
npm run benchmark                          # every configuration, full report
npm run benchmark -- --config yin-11k-w512 # one configuration
npm run benchmark:check                    # non-zero exit on budget or baseline drift
npm run benchmark -- --update-baseline     # re-record after an intended change
npm run benchmark -- --json                # machine-readable
```

`npm test` runs the same budget and baseline checks as part of the suite, so a
change in detector behaviour fails the ordinary test run.

**When a baseline check fails**, it does not necessarily mean something broke —
it means behaviour moved. Read the diff, decide whether the move was intended,
then re-record. Re-recording is deliberately a separate explicit command: it
should be a decision someone makes after reading a diff, never a side effect of
running the tool.

**Adding a detector** (pYIN, MPM, SWIPE, a neural post-processor): add a
`DetectorConfig` and a `BenchmarkDetector` in `benchmark/detectors.ts`. The
corpus, the metrics and the report do not change, and the new detector is
measured on identical material by construction.

**Adding material**: add cases in `benchmark/corpus.ts`. The reference pitch is a
function of the window span, and a window straddling a transition must return
`'excluded'` — scoring it would charge the detector for the corpus's own
construction.

### Module layout

| File | Responsibility |
|---|---|
| `signals.ts` | deterministic signal generation (also feeds the YIN suite) |
| `corpus.ts` | the synthetic cases and their exact-by-construction reference |
| `detectors.ts` | detector configurations and the engine drift guard |
| `metrics.ts` | pure metric functions — accuracy, octave, voicing, stability, confidence, settling |
| `runner.ts` | drives a configuration over the corpus, aggregates by band |
| `budgets.ts` | measured limits per band, and the check |
| `report.ts` | human-readable tables, and the machine-diffable baseline |
| `cli.ts` | `npm run benchmark` |
| `baselines/` | committed measurements, one file per configuration |
