# Real-vocal benchmark corpus

Drop `<id>.wav` + `<id>.json` pairs here. Both are produced by
`scripts/annotate_vocal.py`; nothing in this directory should be hand-created
except the `"verified"` flag.

This folder lives outside `src/` on purpose: Metro treats `.wav` as a bundleable
asset, and a corpus inside `src/` would eventually ship inside the app.

## Why this corpus exists

The synthetic corpus bounds the *algorithm* against a reference that is exact by
construction, since those signals are synthesized from a known pitch. It
cannot produce the things that actually break pitch detection in production:
glottal fry at the bottom of a phrase, breath and consonant transients, room
reverberation, a phone preamp's noise floor, automatic gain control, a singer
sliding into a note rather than arriving at it. Those are what this corpus is
for.

## Two categories, and why the split is enforced

Every recording declares `category`, and it decides what the recording may be
used for:

| Category | What it is | What it measures |
|---|---|---|
| `sustained` | deliberately straight held notes, no vibrato | **the only** basis for pitch-accuracy figures |
| `expressive` | vibrato, slides, phrasing, scales, real singing | tracking and robustness — voicing, dropouts, octave errors |

The reason is measured, not stylistic. Cents accuracy can only be scored against
an automatic annotation where the pitch is genuinely still: pYIN smooths pitch
movement temporally, so on moving material the detector and the annotation
disagree *by construction* — 1.27¢ on a vibrato'd phrase versus
0.39¢ on the identical phrase sung straight. Filtering cannot rescue it, because
every filter must consult the annotation and the annotation is what got
smoothed.

So `expressive` recordings are valuable and wanted — they are the only way to
measure how the engine behaves on real singing — but they never contribute to an
accuracy number. `expressive` is the ingestion script's default; contributing to
accuracy is opt-in. If you declare a take `sustained` and it wobbles anyway, the
benchmark names it and asks you to re-record.

## Installed: VocalSet long tones, straight technique

100 recordings ingested 2026-08-02 — all 20 VocalSet singers × 5 vowels, from
`FULL/<singer>/long_tones/straight/`. CC BY 4.0. Ingested with:

```bash
python3 scripts/ingest_vocalset.py <extracted-VocalSet> --context long_tones --technique straight
```

VocalSet ships at 44.1 kHz mono, the pipeline's exact capture rate, so nothing is
resampled. These are `category: sustained` and `verified: false` — the
annotations are pYIN and no human has checked them, so they support tracking
metrics but not an accuracy claim.

**Two things the first ingest taught us**, both now fixed in the ingester:

1. **librosa's `pyin` defaults to `resolution=0.1` — a 10-cent grid.** Every
   adjacent distinct f0 value differed by exactly 10.000 cents, and the
   benchmark's apparent detector error came out at 3.3¢, almost exactly the
   2.9¢ RMS noise that grid produces on its own. The benchmark was measuring the
   annotator's rounding. Annotation now runs at `resolution=0.05` (a 5-cent grid,
   1.44¢ RMS), recorded per recording as `annotatorErrorCents` so the harness can
   report what it cannot resolve. Finer grids were measured and are affordable
   for a smaller corpus: 0.02 costs ~38 s/file and 0.01 ~64 s/file, against ~4 s
   at 0.05. Re-annotate finer the day a cents figure has to be defended rather
   than surveyed.
2. **The full 55–1400 Hz search range makes a fine grid unaffordable** — 6
   minutes per file. Annotation is now two-pass: a coarse pass finds the range
   the recording uses (via 1st/99th percentiles, so one stray octave-error frame
   cannot double it), and the fine pass searches that range padded by a fifth.

## Stage 1 — the owner's own voice

Start here. One singer is not a corpus, but it is enough to establish the first
real-world baseline and to shake out the pipeline.

Your onboarding measured a range of **G3–F5** (196–698 Hz). Re-check it if that
has moved. That range covers three of the six bands and *cannot* reach the other
three, which is worth knowing before the results are read as complete:

| Band | Covered by G3–F5? |
|---|---|
| sub-low (<65 Hz) | no |
| low (65–130) | no |
| mid (130–330) | yes — G3 to E4 |
| upper-mid (330–660) | yes — F4 to E5 |
| high (660–1000) | just — F5 at 698 Hz |
| above-range (>1000) | no |

### The sustained set — record these first

One file per note, 4–5 seconds, held as straight as you can, no vibrato, no
swell. Sing to a reference pitch if it helps, but stop the reference before
recording so it does not end up in the file.

`G3 · B3 · D4 · F4 · A4 · C5 · E5 · F5`

Eight files at ~4.5 s each is about 3600 voiced frames spread across three
bands, which is enough for a first accuracy figure in `mid` and `upper-mid` and
a thin one in `high`. Add a second pass at a quieter level if you have the
patience — level interacts with the noise floor and with any automatic gain
control, and that interaction is invisible to the synthetic corpus.

```bash
python3 scripts/annotate_vocal.py g3.m4a --id owner-sustained-g3 \
  --category sustained --label "Held G3, straight" \
  --source "owner, recorded <date>" --license "owner-recorded, project use" \
  --consent "singer is the project owner" \
  --voice-type <yours> --level normal --environment <room> --device <mic> \
  --sonify
```

### The expressive set — record these second

Same voice, same room, declared `expressive`:

1. **Slow chromatic scale** across the full range — the coverage backbone, and
   it distributes frames across bands by construction.
2. **A slow legato phrase** with real slides between notes — portamento is
   something the engine must not penalise, and synthesis cannot fake a real one.
3. **The same phrase quiet and loud.**
4. **Deliberately awkward**: a phrase that ends in vocal fry, a breathy verse, a
   note approached from below, a strained note near the top of the range.
5. **Singing with backing audio playing in the room** — the speaker-bleed case
   the clarity gate provably cannot solve.

### Conditions to vary, once the basics are in

Built-in phone mic vs. headset vs. external mic; quiet room vs. live kitchen vs.
somewhere with traffic or a TV. These are exactly what the synthetic corpus
cannot represent.

## Stage 2 — other singers, later

Band coverage is the property casual collection always gets wrong. Comfortable
mid-range singing is easy to record and is where the detector already measures
0.28¢; the bands that decide whether the declared range is honest are the ones
nobody sings into by accident. Full targets, for when the corpus grows past one
voice:

| Band | Target frames | Notes |
|---|---|---|
| sub-low (<65 Hz) | ≥ 300 | needs a bass; hard to get, and where accuracy is worst |
| low (65–130) | ≥ 1000 | bass/baritone bottom |
| mid (130–330) | ≥ 2000 | the core; easiest to over-collect |
| upper-mid (330–660) | ≥ 1500 | |
| high (660–1000) | ≥ 800 | needs a soprano or falsetto |
| above-range (>1000) | ≥ 200 | confirms the failure is real on real voices |

A frame is 10 ms, so 1000 frames is 10 seconds of *voiced* audio in that band.
`annotate_vocal.py` prints each recording's coverage and the benchmark prints the
corpus total.

Three to five voices spanning at least one low and one high type is the eventual
target: vocal fry, vibrato rate and breathiness vary enormously between singers,
so a corpus of one measures how well the detector handles that one person.

## Technical requirements

- **44.1 kHz** — the pipeline's capture rate. The loader rejects anything else
  rather than resampling, because a resampler in the measurement path produces
  artefacts indistinguishable from detector error. `annotate_vocal.py` converts
  at ingestion.
- Mono, 16-bit PCM (the script writes this).
- No compression, no noise reduction, no EQ, no normalisation. Whatever the
  recorder's "voice enhancement" does, turn it off — the point is to measure
  what the microphone actually delivers.
- Peaks below clipping. The script warns above 0.999.
- 5–30 seconds per file. Longer is fine but harder to verify.

## Provenance is mandatory

Every recording must declare `source`, `license` and `consent`, and the loader
rejects it otherwise. This project has a documented legal boundary around vocal
audio; a benchmark corpus is exactly the kind of thing that accumulates files
nobody can account for a year later. If a singer is not the project owner, get
their agreement in writing that the recording may be kept and used for testing,
and say so in `consent`.

## Verifying an annotation

`annotate_vocal.py` writes `"verified": false` and it is the only thing that may
write that field as false. pYIN is itself a pitch detector, so an unverified
annotation measures agreement between two detectors, not correctness.

Run with `--sonify` and listen to `<id>.verify.wav`: your voice on the left, the
annotated pitch as a sine on the right. Where the sine tracks the voice the
annotation is good; where it jumps an octave, drops out mid-note, or wanders
during a breath, it is not. Trim or fix those regions, then set
`"verified": true` in the JSON by hand.

The benchmark reports trusted and untrusted recordings separately and will not
pool them, so unverified material is still useful — it just cannot be used to
claim an accuracy figure.

## Storage — Git LFS

Audio is tracked with Git LFS; annotations, metadata and this document are
ordinary text in the main repository, so a recording's reference annotation
stays readable and diffable in a normal clone. The patterns are already in
[`.gitattributes`](../../.gitattributes).

**Set LFS up before committing any audio.** LFS does not retroactively capture
files already written to history — that needs `git lfs migrate`, which rewrites
commits. `git-lfs` is not installed on this machine and there is no Homebrew, so
install it the same way Node was installed here — download the darwin-arm64
tarball from https://github.com/git-lfs/git-lfs/releases and run its
`install.sh`, or place the binary on your `PATH`. Then, once:

```bash
git lfs install && git lfs track
```

`git lfs track` with no arguments lists the active patterns; confirm the
`benchmark-corpus` entries appear before the first `git add` of a `.wav`.

A 20-second mono 44.1 kHz 16-bit file is about 1.7 MB, so the stage-1 sustained
set is roughly 15 MB. `*.verify.wav` sonifications are gitignored — they are
regenerable and twice the size of the recording.
