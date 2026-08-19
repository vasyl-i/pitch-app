# Pitch Engine Technical Audit

**Date:** 2026-07-28
**Scope:** microphone capture → displayed score, across all four listening
features (staff practice, ear training, vocal-range detection, instrumental
sing-along).
**Method:** static review, then empirical measurement of the real `yin.ts`
against a deterministic synthetic corpus
(`src/features/pitch-detection/benchmark/signals.ts`). Every number below is
measured, not estimated. Reproduce with `npm test`.

> **Superseded in part (2026-08-01).** The measurements here have been folded
> into a standing benchmark harness — `src/features/pitch-detection/benchmark/`,
> documented in [PITCH_BENCHMARK.md](PITCH_BENCHMARK.md) — which reports
> accuracy, octave error, latency, stability and confidence quality per
> operating range with a committed baseline. Where the two disagree, the
> benchmark is current. Two claims in this document are now priced rather than
> reasoned: roadmap item 6 (higher analysis rate) measures at 3.9x CPU for a
> complete removal of the >1kHz failure, and the clarity finding (F1) measures
> at 66.7% of genuine singing lost to any threshold that rejects a backing
> track. The audit's conclusions are unchanged.

> **Audit discipline note.** Four hypotheses formed during static review were
> tested and **three were refuted** by measurement (low-frequency dropout,
> octave-high errors on breathy timbres, and a "loosen the octave guard" fix).
> They are documented as refuted rather than deleted, because the refutations
> are what justify *not* touching working code. One unpredicted hard failure
> was found in their place.

---

## 1. Current pipeline

```
Microphone — react-native-audio-api AudioRecorder
  44.1 kHz mono, HOP 512 samples → callback every ~11.6 ms
        ↓
Clip detection                    |sample| ≥ 0.985 → frame.clipped
        ↓
Anti-alias FIR + 4× decimation    24-tap windowed sinc (Hamming),
  cutoff at decimated Nyquist, carry buffer preserves FIR state
  across chunk seams                          → 11.025 kHz
        ↓
Sliding analysis window           512 samples = 46.4 ms, ~75% overlap
        ↓
YIN (yin.ts)                      difference → CMND → absolute-threshold
  search (0.12, fallback 0.30) → half-τ octave guard → parabolic
  interpolation           → {frequency, rms, clarity}
        ↓
PitchFrame {frequency, rms, clarity, clipped, when}   ~86 frames/s
        ↓
micBroker        single exclusive lease, serialized start/stop
referenceGate    frames captured while the app's own reference audio was
                 audible (+150 ms tail) are DROPPED, not forwarded
        ↓
Per-feature conditioning (signal.ts — composition is a deliberate choice)
  VoiceGate       adaptive floor = 10th percentile of 20 s RMS history;
                  enter 1.7×floor, sustain 1.15×floor; 400 ms / 1.2-st
                  continuity assist
  PitchSmoother   median-of-3 → EMA α 0.6, snaps on jumps > 2 st
  SustainTracker / StabilityTracker / VibratoDetector as needed
        ↓
freqToMidi = 69 + 12·log₂(f/440)   →   cents
  staff & ear:    centsToNearestOctave (octave-agnostic, ±600 ¢)
  instrumental:   distance to nearest scale tone of the detected key
        ↓
Note segmentation
  staff:         per-target windows, 100 ms attack skip, 50 ms grade lag,
                 median cents/note, coverage fraction
  instrumental:  NoteAggregator — ≥180 ms sustain within 0.8 st,
                 150 ms gap closes a note, median midi/cents per note
        ↓
Scoring
  staff phrase:  0.7·pitch + 0.2·rhythm + 0.1·stability
  instrumental:  0.7·in-key time + 0.3·cents precision (duration-weighted)
        ↓
UI — Zustand stores, 33–66 ms throttle, Skia canvases
```

### Stage assessment

| Stage | Why it exists | Inaccuracy sources | Latency | Confidence |
|---|---|---|---|---|
| Capture 44.1 k / 512 | HOP halved to cut detection latency | device AGC; BT/HFP routes untested | 11.6 ms | High (iOS) |
| FIR + decimate 4× | Hermes cannot run YIN at 44.1 kHz (~50× slower than JIT JS) | 24 taps attenuate rather than eliminate >5.5 kHz; **caps usable f0 — see N1** | ~0.3 ms group delay | High |
| Window 46.4 ms | YIN needs ≥2 periods of the lowest target pitch | integration span is 512−maxLag samples, so low f0 gets fewer periods | ~23 ms effective | High |
| YIN | standard monophonic f0; pure TS, portable to packages/core | see §3 | **0.067 ms/frame (node)** | High in 65–988 Hz |
| referenceGate | the app's own oscillator reads as a flawless singer; no heuristic can separate it | over-blocks ~150 ms after reference audio (deliberate) | — | High (unit-tested) |
| VoiceGate | rooms differ; fixed thresholds fail quiet and loud singers alike | learns the floor *during* music playback → floor rises → quiet singing rejected in speaker mode | none added | Medium |
| PitchSmoother | removes octave blips and tremor | adds ~2 frames (≈23 ms); EMA drags through fast runs | ~25 ms | High |
| Note segmentation | frames → musical events | 180 ms sustain delays the visible onset (accepted anti-bleed cost) | 180 ms (instrumental) | Medium-high |
| Scoring | one comparable 0–100 across features | weights are product judgements, not measured against human raters | — | Medium |

**End-to-end mic → visible feedback ≈ 70–120 ms** (capture 12 + window 23 +
compute ~1–3 + smoother 25 + UI throttle 33–66). Comparable to commercial
targets (<100 ms). The instrumental note-bar onset is deliberately slower
(~180 ms) because sustain is the anti-bleed defence.

---

## 2. Pitch-detection parameters vs. best practice

| Parameter | Value | Assessment |
|---|---|---|
| Algorithm | YIN — CMND, absolute threshold, parabolic interpolation | Correct, faithful to the 2002 paper |
| Analysis sample rate | 11.025 kHz (44.1 k ÷ 4) | Fine for f0 ≤ ~1 kHz; **the binding constraint above that (N1)** |
| Window | 512 samples = 46.4 ms | Standard; ≥3 periods for f0 ≥ 65 Hz |
| Hop | 128 samples = 11.6 ms | Good; 75 % overlap |
| Frequency resolution | sub-Hz above 100 Hz via parabolic interpolation | Good — measured ≤1.6 ¢ median across all musical material |
| Min detectable | nominal 55 Hz | **Measured usable ≈ 65 Hz**; 55 Hz works but at 12.6 ¢ error (vs 0.1 ¢ above) |
| Max detectable | nominal ~2.5 kHz | **Measured usable ≈ 1 kHz** — hard octave-low failure above it (N1) |
| Confidence (`clarity`) | 1 − CMND at chosen lag | Correctly computed, but **cannot do the job two call sites ask of it (F1)** |
| Octave correction | half-τ guard (octave-low only) | Fires correctly on period-doubled input (12/12); harmless elsewhere (0 % false fires) |
| Voiced/unvoiced | RMS gate 0.002 → YIN dip → per-feature VoiceGate | Layered and effective: noise/whisper → 0 % voiced |
| Noise suppression | none in-engine; adaptive floor downstream | Acceptable for close-mic; **no DC removal (F2)** |
| Filtering | anti-alias FIR only | Appropriate |
| Smoothing | median-3 → EMA 0.6, 2-st snap | Best practice for display; borderline for melisma scoring |
| Hysteresis | 1.7× enter / 1.15× sustain + continuity | Good design |
| Note segmentation | two implementations (staff evaluator, NoteAggregator) | Both sound; parameters already named and documented |

---

## 3. Measured findings

### F1 — `clarity` cannot separate voice from music, and both gates using it are no-ops (**confirmed, sharpened**)

| Signal | voiced % | clarity min | clarity mean |
|---|---|---|---|
| pure sine 220 Hz | 100 % | 1.00 | 1.00 |
| voice-like (12 harmonics) | 100 % | 1.00 | 1.00 |
| breathy (40 % noise) | 100 % | 0.91 | 0.93 |
| very breathy (80 % noise) | 100 % | 0.73 | 0.77 |
| whisper / room noise | **0 %** | — | — |
| **2-tone "music" (C+G)** | 100 % | **0.99** | **0.99** |
| **3-tone chord + bass** | 100 % | **0.98** | **0.98** |

Two consequences, and the second matters more than the first:

1. Every frame that yields a frequency has clarity ≥ 0.73. `guidedDetection`
   gates at 0.35 and `InstrumentalSingScreen` at 0.60 — **both filter
   nothing.**
2. A polyphonic music mix scores **0.98**, statistically indistinguishable
   from a clean sung vowel at 1.00. **No threshold on clarity can separate
   speaker bleed from singing.** The instrumental screen's `CLARITY_MIN`
   was therefore not merely mis-tuned — it encoded a false belief about what
   the measure can do.

What clarity *is* good for: rejecting very breathy / unreliable frames
(0.73–0.93 band), and it already rejects pure noise outright by returning
no frequency at all.

### N1 — Hard octave-low failure above ~1 kHz (**new; not predicted**)

| f0 | detected | error |
|---|---|---|
| 784 Hz (G5) | 786.6 | +6 ¢ |
| 988 Hz (B5) | 995.6 | +13 ¢ |
| **1047 Hz (C6)** | **524.4** | **−1197 ¢** |
| **1175 Hz (D6)** | **585.8** | **−1205 ¢** |
| **1319 Hz (E6)** | **656.6** | **−1208 ¢** |

Root cause — established by instrumenting the search, **not** by inspection:
at 11.025 kHz a 1047 Hz tone spans only **10.5 samples per period**. The true
period is non-integer, so its CMND dip is smeared across two bins and never
clears the 0.12 threshold (measured cmnd[10] = 0.158), while the sub-harmonic
at τ = 21 gives a near-perfect dip (0.003). The first-dip search therefore
selects 2× the true period. **The octave guard never fires here** — the
initial hypothesis that it was responsible was refuted by instrumentation.

A threshold fix was then built and swept against three suites before being
rejected on evidence:

| absolute sub-harmonic limit | HIGH (>1 kHz) | NORMAL (82–988 Hz) | period-doubled |
|---|---|---|---|
| current | 68 % | 97 % | 100 % |
| 0.35 | 71 % | 97 % | 100 % |
| 0.50 | 73 % | 98 % | 100 % |

It recovers exactly one of three failing notes (1047 Hz), and only because
that period happens to land near an integer; 1175 and 1319 Hz stay an octave
low. **This is a sampling-resolution limit, not a tunable threshold.** A real
fix means a higher analysis rate at the top of the range (≈4× the CPU) or a
spectral cross-check — neither justified by the affected population.

**User-facing harm:** a soprano measuring her highest note at C6 in onboarding
would have an octave-low value written to her vocal profile, mis-transposing
every subsequent exercise. Low frequency (beginner-focused product; C6 is
above almost all users), medium severity. **Resolution: specify and document
the operating range rather than hack the detector.**

### N2 — Accuracy degrades with pitch long before the ceiling (**new; found by the test suite**)

The first run of the regression suite failed at B5 against a flat 10 ¢
budget. That was not a test bug — resolution falls as pitch rises, because
samples-per-period ≈ 11025 / f0:

| note | f0 | samples/period | mean abs error |
|---|---|---|---|
| C4 | 262 Hz | 42 | **0.60 ¢** |
| C5 | 523 Hz | 21 | 2.41 ¢ |
| G5 | 784 Hz | 14 | 5.36 ¢ |
| B5 | 988 Hz | 11 | **12.68 ¢** |
| C6 | 1047 Hz | 10.5 | **octave error (N1)** |

A ~20× precision spread across the singing range. It stays musically usable —
12.7 ¢ at B5 is still inside the 25 ¢ band the app calls "near-perfect" — but
it has two consequences worth recording: per-user statistics are
systematically more precise for low voices than high ones, and the accuracy
budget in the test suite is banded by pitch rather than flat, so a regression
at the bottom of the range cannot hide behind a bound loose enough for the
top.

### N3 — The voice gate shut on sustained singing (**found post-audit from a user report; highest severity so far**)

Reported symptom: "not all notes I've sung were visualized." Running synthetic
phrases through the *whole consumer chain* (YIN → clip/clarity/range gates →
VoiceGate → smoother → NoteAggregator) and attributing every dropped frame to
the stage that dropped it located it immediately — and it was not the stage I
expected:

| phrase | notes sung | notes shown | frames killed by VoiceGate |
|---|---|---|---|
| clean, 400 ms notes | 5 | 4 | 38 |
| vibrato, 600 ms notes | 5 | **0** | **263** |
| legato, no gaps, 300 ms | 6 | **0** | **148** |
| fast, 140 ms notes | 8 | 0 | 96 |

**Root cause — a self-defeating feedback loop.** `createVoiceGate` pushed
*every* frame into its rolling RMS history, including the singer's own voice.
The history is 20 s deep, so continuous singing fills it entirely with
singing; the 10th-percentile "noise floor" then rises to the quiet end of that
voice, and the enter threshold (`floor × 1.7`) climbs *above* the level being
sung. The gate shuts on the singer. Short exercises masked it — a 5 s phrase
never fills the window — so it took the long backing-track takes of the new
sing-along feature to expose it.

A first fix (exclude voiced frames from the history) recovered vibrato and
clean phrases but left legato at 1/6. The residue: the detector finds no pitch
for a frame or two at each legato transition, and those frames are *loud* —
the singer mid-phrase, not the room. Four were enough to poison the estimate.
The condition that actually encodes the intent is "the room is speaking for
itself": neither voiced, nor within `CONTINUITY_MS` of the last confirmed
voice. With that, VoiceGate rejections fall to **zero across every case**.

A `MIN_FLOOR_SAMPLES` guard (20 background frames) was added alongside, so a
single unrepresentative sample cannot raise the bar on its own.

**Second cause of the same symptom:** `MIN_NOTE_SEC` was 180 ms, which
silently discarded ordinary singing — a sixteenth note at 120 bpm lasts
125 ms (measured: 0 of 8 shown at 140 ms/note). Lowered to 100 ms, which still
spans ~8 analysis frames. Combined result:

| phrase | before | after |
|---|---|---|
| legato 300 ms | 0/6 | **6/6** |
| vibrato 600 ms | 0/5 | **5/5** |
| clean 400 ms | 4/5 | **5/5** |
| moderate 250 ms | 7/8 | **8/8** |
| fast 140 ms | 0/8 | **8/8** |

Both are pinned by regression tests (`voiceGate.test.ts`).

### F2 — No DC removal inflates RMS by up to 47 % (**confirmed**)

| DC offset | mean RMS | inflation | pitch error |
|---|---|---|---|
| 0.00 | 0.28 | — | 0.41 ¢ |
| 0.15 | 0.32 | +14 % | 0.41 ¢ |
| 0.30 | 0.41 | **+47 %** | 0.41 ¢ |

YIN's difference function is DC-invariant, so pitch is untouched — but `rms`
drives **every** voice gate in the app. Handling rumble or a biased ADC can
hold gates open on silence. One mean subtraction per window fixes it.

### Refuted hypotheses

- **"Low pitch flickers or drops out."** False. Voicing is 100 % from 55 Hz
  up. What actually degrades is *accuracy*: 12.6 ¢ at 55 Hz (A1) vs ≤0.2 ¢
  from 65 Hz (C2) upward. Usable; no change warranted.
- **"Breathy / weak-fundamental timbres cause octave-high errors."** False.
  0 % octave errors across bright (rolloff .85), dull (.35), breathy (40 %
  noise) and suppressed-fundamental timbres over 82–988 Hz.
- **"Loosening the octave guard fixes the top end."** False — see N1 sweep.

### Verified-correct (no action)

| Material | notes | correct | median abs error | octave errors |
|---|---|---|---|---|
| chromatic, legato | 13 | 13 | 0.55 ¢ | 0 % |
| major scale (C4) | 8 | 8 | 1.51 ¢ | 0 % |
| minor scale (A3) | 8 | 8 | 0.60 ¢ | 0 % |
| major arpeggio | 7 | 7 | 0.60 ¢ | 0 % |
| interval jumps | 8 | 8 | 0.65 ¢ | 0 % |
| slow legato | 8 | 8 | 1.47 ¢ | 0 % |
| **fast staccato (120 ms notes)** | 8 | 8 | 1.58 ¢ | 0 % |
| male range (A2 major) | 8 | 8 | 0.16 ¢ | 0 % |
| female range (A4 major) | 8 | 8 | 1.18 ¢ | 0 % |

Also verified: **vibrato** (5.5 Hz / 80 ¢ peak-to-peak → 24 ¢ mean deviation,
0 % octave errors — tracked, not smeared); **level sensitivity** (correct down
to amplitude 0.004, cutting off at the documented 0.002 RMS gate); **MIDI and
cents math**; **compute cost** 0.067 ms/frame on node → est. 0.7–3.4 ms on
Hermes against an 11.6 ms budget.

### Remaining risks (documented, not fixed)

- **Mixed clocks.** Frames carry `when` (audio clock) but every consumer
  timestamps with `Date.now()` at JS delivery, adding 5–15 ms of thread
  jitter to note timing. Harmless at current tolerances (100 ms attack skip);
  blocking only if rhythm scoring tightens.
- **VoiceGate cost.** Full sort of 860 samples per frame × 86 fps ≈ 700 k
  ops/s. Not a dropped-frame risk; wasteful.
- **Speaker-mode bleed.** Given F1, the *only* effective defences are the
  range filter, the sustain requirement and headphones. This is now a
  documented product limit, not a solvable DSP problem at this layer.
- **Platform coverage.** Android (AAudio buffer sizes, AGC) and Bluetooth
  HFP routes (8–16 kHz band, 100–300 ms latency) are untested — needs a
  device matrix, not desk work.

### Can the engine reliably estimate…?

| Quantity | Verdict |
|---|---|
| raw frequency | **Yes, 65 Hz – 1 kHz** (specified range); degrades below, fails above |
| stable frequency | Yes |
| MIDI / cent deviation | Yes — ≤1.6 ¢ median on all musical material |
| confidence | Yes as a *voice-quality* measure; **no** as a voice-vs-music discriminator |
| note onset / offset / duration | Yes, ±1 hop (~12 ms) after sustain/gap rules |
| vibrato | Yes (rate + extent), currently underused |
| pitch drift | Yes (StabilityTracker, note heat-map) |
| intonation stability | Yes (phrase stability metric) |

**Conclusion: the engine is sound enough to support melody tracking, interval
recognition, vocal-profile generation and long-term statistics without
architectural rewrites**, provided the 65 Hz – 1 kHz operating range is
declared and respected.

---

## 4. Improvement roadmap

| # | Improvement | Difficulty | Risk | Measured gain | Cost | Verdict |
|---|---|---|---|---|---|---|
| 1 | Synthetic-signal regression suite | Low | None | Makes every other item measurable; would have caught N1 | ~200 LOC | **Ship** |
| 2 | Declare the operating range (`MIN/MAX_RELIABLE_F0`) in code + docs (N1) | Low | None | Prevents silent octave-low vocal profiles | ~20 LOC | **Ship** |
| 3 | Honest clarity bands; remove the two no-op gates (F1) | Low | Low | Removes a false safety belief; gates breathiness where it works | ~30 LOC | **Ship** |
| 4 | DC removal per analysis window (F2) | Trivial | Low | −47 % RMS error in rumble → correct gating | 3 LOC | **Ship** |
| 5 | Dev-only per-frame diagnostics, zero prod cost | Low | None | Enables on-device threshold tuning | ~120 LOC | **Ship** |
| 6 | Higher analysis rate above 1 kHz (true N1 fix) | High | High | Extends ceiling ~1 octave; also shrinks N2 | 4× CPU | **Reject** — affected population does not justify it |
| 7 | Loosen octave guard | Low | Medium | +3 pp, non-robust | — | **Reject on evidence** |
| 8 | Incremental quantile in VoiceGate | Low | Low | CPU only | ~30 LOC | Opportunistic |
| 9 | Consumers adopt `frame.when` | Medium | Medium | Needed only if rhythm scoring tightens | cross-feature | Defer |
| 10 | Android / Bluetooth device matrix | — | — | Retires unknown risk | hardware | Needs devices |

Items 1–5 are implemented in this pass. Items 6–10 are deliberately not.
