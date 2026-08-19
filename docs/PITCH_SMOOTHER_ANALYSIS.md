# `createPitchSmoother` — Component Analysis and Redesign Options

Status: 2026-08-03. **Analysis only. No production code changed, no algorithm
implemented.**
Component: `src/features/pitch-detection/lib/signal.ts` → `createPitchSmoother`
Evidence: the VocalSet real-world baseline (100 recordings, 65,555 scored
frames) plus pure component characterization.
Companion: [REAL_WORLD_BASELINE.md](REAL_WORLD_BASELINE.md).

---

## 0. Method, and the control that makes it trustworthy

The detector runs **once** per recording; every smoothing variant is then applied
offline to the same raw MIDI stream. Differences between variants are therefore
the smoothing and nothing else — no detector noise, no corpus differences.

Before any of it is used, the ablation's replica of the shipping smoother is
checked frame-for-frame against the real `createPitchSmoother`:

```
control: replica vs production createPitchSmoother — 14044 frames, 0 mismatches
```

Component characterization (step, ramp, impulse) uses the **production function
directly**, not the replica.

---

## 1. Why smoothing takes mis-coloured frames from 3.78% to 20.11%

**Because a group-delay filter converts pitch *velocity* into pitch *error*, and
real singing is almost never static.**

The smoother is two cascaded lag elements: a causal median-of-3 (1 frame of
delay) and an EMA with α = 0.6 (0.667 frames). Total group delay 1.667 frames =
19.4 ms. While the pitch is moving at velocity *v*, a delay *τ* produces a
steady-state error of exactly *v · τ*.

That model is not a hand-wave. Feeding the production function a constant-rate
ramp reproduces it to two decimal places:

| Input velocity | Measured lag | Predicted `v × 1.667 × hop` |
|---|---|---|
| 40 ¢/s | 0.77¢ | 0.77¢ |
| 120 ¢/s | 2.32¢ | 2.32¢ |
| 300 ¢/s | 5.80¢ | 5.80¢ |
| 600 ¢/s | 11.61¢ | 11.61¢ |
| 1200 ¢/s | 23.22¢ | 23.22¢ |

The synthetic corpus is built from *sustained tones*, where v ≈ 0 and the lag
therefore costs nothing. Real singing is not like that. Measured over the
VocalSet corpus — which is deliberately **straight, sustained, professional**
singing, the most static real material obtainable:

| Annotation pitch velocity | Frames | Share |
|---|---|---|
| 0–40 ¢/s | 10,904 | 17% |
| 40–120 ¢/s | 17,497 | 27% |
| 120–300 ¢/s | 18,044 | 28% |
| 300–600 ¢/s | 11,699 | 18% |
| 600+ ¢/s | 7,411 | 11% |

**83% of frames are moving faster than 40 ¢/s.** Even on held notes a human
larynx drifts continuously. The smoother's error tracks that velocity exactly as
the model predicts:

| Velocity bin | raw | shipping | excess | predicted lag |
|---|---|---|---|---|
| 0–40 ¢/s | 1.69¢ | 2.02¢ | +0.33¢ | ~0.4¢ |
| 40–120 | 1.80¢ | 2.72¢ | +0.92¢ | ~1.5¢ |
| 120–300 | 2.26¢ | 5.07¢ | +2.81¢ | ~4.1¢ |
| 300–600 | 3.76¢ | 10.55¢ | +6.79¢ | ~8.7¢ |
| 600+ | 7.84¢ | 23.78¢ | +15.94¢ | ~16¢ at 820 ¢/s |

At low velocity the smoother is nearly free. At the velocities where most real
frames actually live, it dominates the error budget. That is the whole
explanation.

---

## 2 & 3. Independent contributors, quantified

Each row is the full corpus with exactly one mechanism active. Baseline is `raw`
(3.78% of frames mis-coloured against the app's own 12¢ threshold).

| Variant | median¢ | p95¢ | >12¢ | jitter¢ | flips/s |
|---|---|---|---|---|---|
| `raw` — no smoothing | 2.43 | 10.59 | **3.78%** | 11.08 | 4.44 |
| `median3` only | 3.83 | 22.13 | 14.73% | 15.18 | 3.85 |
| `ema-only` (α 0.6, snap 2) | 3.01 | 16.40 | 9.10% | 11.77 | 3.93 |
| **`shipping`** (median3 + EMA + snap) | 4.65 | 28.32 | **20.11%** | 16.36 | 3.62 |
| `no-snap` (always glide) | 4.76 | 34.99 | 21.59% | 42.01 | 4.80 |
| `always-snap` (EMA disabled) | 3.83 | 22.13 | 14.73% | 15.18 | 3.85 |
| `ema-0.8` (faster) | 4.12 | 24.66 | 16.95% | 15.62 | 3.81 |
| `ema-0.4` (slower) | 5.49 | 33.72 | 24.36% | 17.74 | 3.18 |
| `shipping-reset` (clear state on gaps) | 4.64 | 28.25 | 20.07% | 12.94 | 3.47 |
| `median5` only | 5.19 | 33.81 | 23.69% | 22.79 | 3.33 |
| **`raw` + note-name hysteresis 0.15st** | 2.43 | 10.59 | **3.78%** | 11.08 | **2.56** |
| **`raw` + note-name hysteresis 0.25st** | 2.43 | 10.59 | **3.78%** | 11.08 | **2.14** |

### The five contributors

**(a) Median-3 group delay — the largest single contributor: +10.95 pp**
(3.78% → 14.73%). One frame of delay, 11.6 ms. Note that `always-snap` is
numerically identical to `median3`, which confirms the decomposition: setting
the snap threshold to 0 disables the EMA entirely and leaves the median alone.

**(b) EMA lag — +5.32 pp** (3.78% → 9.10%). 0.667 frames, 7.7 ms.

**(a) and (b) are almost perfectly additive.** 10.95 + 5.32 = 16.27 pp against a
measured combined effect of 16.33 pp — an interaction of 0.06 pp. The two lag
terms simply sum, exactly as cascaded group delays should. Between them they
account for the entire degradation; there is no third mystery term.

α is a straight trade along that axis and nothing more: α 0.8 → 16.95%, α 0.6 →
20.11%, α 0.4 → 24.36%. No value of α escapes, because α only scales the lag.

**(c) Semitone snapping — a *benefit* of −1.48 pp**, not a cost. Disabling it
(`no-snap`) makes things worse: 21.59%, and jitter explodes from 16.36¢ to
42.01¢ because the EMA glides across every leap, smearing through the notes
between. Snapping is the one part of this design that is clearly earning its
place.

It does, however, contain a perverse discontinuity. From the step response:

| Step | Frames to settle | ms |
|---|---|---|
| 0.5 st | 3 | 34.8 |
| 1.0 st | 4 | 46.4 |
| 1.9 st | 5 | 58.0 |
| **2.1 st** | **2** | **23.2** |
| 5 st | 2 | 23.2 |
| 12 st | 2 | 23.2 |

**A 1.9-semitone interval takes 58 ms to settle; a 2.1-semitone interval takes
23 ms.** The smaller interval is 2.5x slower. Every interval a singer is most
likely to sing — a tone, a semitone — falls on the slow side of that cliff.

**(d) Hysteresis / state persistence across gaps — +0.04 pp, negligible.**
`shipping` vs `shipping-reset` is 20.11% vs 20.07% on accuracy. It is not
irrelevant everywhere, though: resetting cuts jitter 16.36¢ → 12.94¢ (−21%) and
flicker 3.62 → 3.47/s, because a stale EMA value carried across a breath makes
the first frames of the next note wrong. Cheap, small, real.

**(e) Transition handling** is (c) plus the step response above. There is no
separate transition machinery — the snap threshold *is* the transition handler,
and its only state is the previous output.

### What the smoothing actually buys, priced

The median-3's job is rejecting isolated octave blips, and it does that
perfectly: a single-frame outlier of *any* magnitude produces **0.0¢** excursion
at the output. Measured on the corpus:

| | Frames | Share |
|---|---|---|
| Isolated single-frame outliers >50¢ (median-3 removes these) | 177 | 0.265% |
| …of which ~one octave (1100–1300¢) | 162 | 0.243% |
| Multi-frame excursions >100¢ (median-3 **cannot** remove these) | 664 | 0.996% |

So the median-3 repairs 177 frames and mis-colours roughly 7,180 (10.95% of
65,555). **It damages about 40 frames for every 1 it fixes**, and the failure
mode it was built for is outnumbered 3.75:1 by multi-frame excursions it cannot
touch anyway.

For flicker — the other stated purpose — the whole smoother buys 4.44 → 3.62
flips/s, a 18% reduction, for that same 16.33 pp of accuracy. Note-name
hysteresis on the *raw* signal buys 4.44 → 2.14 flips/s, a **52%** reduction,
for **zero** accuracy cost. The smoother is being outperformed at its own job by
a mechanism that does not touch the pitch value at all.

---

## 4. Alternative strategies

Five options, cheapest first. Numbers marked **measured** come from the ablation
above; everything else is an expectation to be tested, not a claim.

### A. Note-name hysteresis on the display path only

Leave the pitch value untouched. Apply hysteresis to the *note-name decision*:
the displayed note changes only when the pitch crosses the boundary by an extra
margin (0.15–0.25 semitone).

- **Measured:** flicker 4.44 → 2.56/s (0.15st) or 2.14/s (0.25st). Accuracy,
  jitter, p95 all **exactly unchanged** — by construction, since the scored value
  is raw.
- **Trade-off:** the displayed note lags slightly at a genuine boundary crossing
  — by the time it takes the singer to move an extra 0.25 semitone. Does nothing
  about octave blips, which would appear as a one-frame note jump.
- **Cost:** small; it is a display concern, not a DSP one. It also cleanly
  separates "what did the singer sing" from "what do we show", which the current
  design conflates.
- **Risk:** low. Nothing scored changes.

### B. Despiking instead of filtering

Replace the median-*filter* with an outlier *detector*: pass every frame through
unchanged unless it is an isolated excursion (frame *n* differs from both
neighbours by >50¢ while the neighbours agree), in which case substitute the
neighbour median.

- **Expected:** keeps essentially all of the median's benefit — it targets
  exactly the 177 frames measured above — while removing the 11.6 ms of delay
  from the other 99.7% of frames. Predicted accuracy close to `raw` (3.78%),
  flicker slightly better than raw.
- **Trade-off:** needs one frame of lookahead, so it costs 11.6 ms of *latency*
  on every frame even though it costs no *lag*. That is a real but different
  cost: constant delay rather than velocity-proportional error.
- **Risk:** low. The detection rule is simple and its target population is
  measured.

### C. One-euro filter (velocity-adaptive smoothing)

An EMA whose cutoff rises with the observed rate of change: heavy smoothing when
the pitch is still, almost none when it moves. Designed for precisely this
trade-off in interactive systems.

- **Expected:** near-`raw` accuracy at high velocity, better-than-`raw` jitter at
  low velocity. The measured velocity distribution (17% of frames under 40 ¢/s)
  says the smoothing would apply where it is genuinely free.
- **Trade-off:** two parameters to tune (minimum cutoff, β), and tuning must be
  done against the real corpus or it will repeat the original mistake of being
  tuned on static material.
- **Risk:** medium. More behaviour to characterize; can oscillate between regimes
  if β is wrong.

### D. α-β (or Kalman) tracker with an explicit velocity state

Model pitch *and* its rate of change, so a constant-velocity input produces
**zero** steady-state error rather than `v · τ`.

- **Expected:** eliminates contributor (a)+(b) by construction — the entire
  16.33 pp — while still averaging out noise. This is the only option that
  attacks the mechanism directly rather than reducing its coefficient.
- **Trade-off:** velocity estimation overshoots at genuine note transitions,
  where the true velocity goes to zero instantly; needs the snap/reset logic
  that contributor (c) already shows is necessary. More state on a JS thread
  that is already tight, though still trivial arithmetic.
- **Risk:** medium-high. Best accuracy ceiling, most new behaviour to validate.

### E. Remove the smoother; make the scoring robust instead

Score from raw frames and use a robust aggregate (median over the note, which
[evaluation.ts](../src/entities/exercise/evaluation.ts) already does) rather than
pre-filtering the stream. Pair with A for display.

- **Measured:** accuracy becomes `raw` — 3.78% mis-coloured, median 2.43¢.
  Flicker is 4.44/s alone, or 2.14/s with A.
- **Trade-off:** removes outlier protection from anything that consumes single
  frames rather than aggregates. Vocal-range detection already guards itself with
  a sustain requirement; instrumental sing and the live readouts would need
  checking.
- **Risk:** low-medium, and it is the option that most reduces total moving
  parts.

### Summary

| Option | Accuracy (>12¢) | Flicker (flips/s) | Confidence |
|---|---|---|---|
| Today (`shipping`) | 20.11% | 3.62 | measured |
| A — display hysteresis | 3.78% | 2.14 | **measured** |
| B — despiking | ~3.8% expected | ~4.0 expected | expected |
| C — one-euro | ~4–6% expected | ~3.5 expected | expected |
| D — α-β tracker | ~4% expected | ~3.5 expected | expected |
| E — remove + robust scoring | 3.78% | 4.44 (2.14 with A) | **measured** |

**A and B are complementary and address different defects** — A fixes flicker, B
preserves octave-blip rejection. A+B together is the combination with the most
measured support and the least new behaviour: it would be expected to land near
3.8% mis-coloured frames at ~2.1 flips/s, against today's 20.11% at 3.62.

C and D are the interesting options only if A+B leaves a jitter problem that
matters, which the current evidence does not show.

---

## 5. Caveats

- **The corpus is one dataset of studio-recorded professional singing.** A phone
  microphone in a noisy room produces more isolated outliers than 0.265%, which
  is exactly the population that makes the median-3 worth more. The cost/benefit
  in §3 could shift; the *mechanism* in §1 will not, because it depends only on
  group delay and pitch velocity.
- **Annotations are unverified pYIN** with a 1.44¢ floor. Every absolute cents
  figure inherits that. The *differences between variants* do not — they share
  the same reference, so the comparison is sound even where the absolute level
  is not.
- **Flicker is counted on the smoothed value's rounded note**, which is what the
  UI shows. It is not measured against what a user would perceive as flicker at
  the UI's own refresh rate (30 fps, slower than the 86 fps frame rate), so the
  absolute rates are an upper bound on what reaches the eye. Again, the
  comparison between variants holds.
- **No option here is implemented or recommended for merge.** The next step is a
  decision on which to prototype, then measurement against this same baseline.
