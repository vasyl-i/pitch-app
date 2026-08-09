#!/usr/bin/env python3
"""
Ingest a vocal recording into the pitch benchmark's real corpus.

Converts the audio to the capture format the pipeline actually receives
(44.1 kHz mono, 16-bit PCM), annotates its f0 contour with pYIN, and writes the
`<id>.wav` + `<id>.json` pair the benchmark loader expects.

    python3 scripts/annotate_vocal.py take01.m4a \\
        --id male-chromatic-quiet \\
        --label "Baritone chromatic scale, quiet, kitchen" \\
        --source "Alex, recorded 2026-08-02" \\
        --license "owner-recorded, project use" \\
        --consent "singer is the project owner" \\
        --voice-type baritone --level quiet \\
        --environment kitchen --device iphone-15-builtin \\
        --material "chromatic scale C2-C3" \\
        --sonify

## The annotation is an estimate, and the benchmark knows it

pYIN is a pitch detector. Annotating with it and then measuring another pitch
detector against the result bounds what can be learned: where the two agree the
measurement is meaningful, and where they disagree the benchmark cannot say
which one is wrong. So this script always writes `"verified": false`, and the
benchmark reports unverified recordings separately from trusted ones.

`--sonify` is how a recording graduates. It writes a stereo file with the
original on the left and a sine at the annotated f0 on the right. Listen to it:
where the sine tracks the voice, the annotation is right; where it jumps an
octave or drops out, it is not. Fix or trim those regions, then set
`"verified": true` by hand. That edit is a person taking responsibility for the
numbers, which is exactly what it should be.

Reference-grade alternatives, if you ever need error below pYIN's floor: an
electroglottograph (`"method": "egg"`), or re-recording a signal we synthesized
so the true f0 is known by construction (`"method": "synthesized-source"`).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

CAPTURE_RATE = 44100
HOP_SEC = 0.01
# Wide enough to catch what the app declares plus the octave-error region above
# it: an annotation that cannot represent a wrong note cannot reveal one.
FMIN_HZ = 55.0
FMAX_HZ = 1400.0

# pYIN quantizes f0 onto a bin grid, and librosa's default `resolution=0.1`
# means 0.1 *semitone* — a 10-cent grid.
#
# That default silently caps what any benchmark built on these annotations can
# resolve. Measured on the first VocalSet ingest: every adjacent distinct f0
# value differed by exactly 10.000 cents, and the detector's apparent median
# error came out at 3.3 cents — almost exactly the 2.9-cent RMS noise a 10-cent
# uniform grid produces on its own. In other words the benchmark was measuring
# the annotator's rounding, not the detector.
#
# pYIN's cost grows steeply with bin count, and the bins span fmin..fmax. Over
# the full 55–1400 Hz search range a 1-cent grid is 5600 bins and takes ~6
# minutes per file — 10 hours for this corpus, which is not a measurement, it is
# a weekend.
#
# So annotation is two-pass: a cheap coarse pass finds the range a recording
# actually uses, then the fine pass searches only that range padded by
# RANGE_PAD_SEMITONES.
#
# Measured cost per file on this corpus, with the narrowed range:
#   resolution 0.01 (1¢ grid, 0.29¢ RMS)  ~64 s
#   resolution 0.02 (2¢ grid, 0.58¢ RMS)  ~38 s
#   resolution 0.05 (5¢ grid, 1.44¢ RMS)  ~4 s
#
# 0.05 is the chosen point. The finer grids are better measurements and were
# tried first; across 100 recordings they cost 1–2 hours of wall clock, and the
# gain is confined to one figure — cents accuracy. Octave errors, voicing,
# note flicker, settling and segmentation, which are most of what the real
# corpus is for, do not depend on this grid at all.
#
# 1.44¢ RMS still sits ~8x below the app's 12-cent "in tune" threshold, so it
# cannot influence any judgement the app makes, but it is *not* negligible
# against a detector whose synthetic error is well under 1¢: a measured real
# error near 2¢ is meaningfully inflated by it. The floor is written into every
# recording as `annotatorErrorCents` so the benchmark reports what it cannot
# resolve, and re-annotating at 0.02 is the right move the day a cents figure
# needs to be defended rather than surveyed.
PYIN_RESOLUTION = 0.05
COARSE_RESOLUTION = 0.1
# Padding around the observed range. Generous on purpose: narrowing the fine
# pass to exactly what the coarse pass saw would freeze the coarse pass's octave
# decisions, and a fifth either way leaves the fine pass room to disagree.
RANGE_PAD_SEMITONES = 7

def annotator_error_cents(resolution: float = PYIN_RESOLUTION) -> float:
    """RMS quantization error of a `resolution`-semitone pitch grid, in cents."""
    return round(resolution * 100 / (12 ** 0.5), 3)

BANDS = [
    ("sub-low", 40, 65),
    ("low", 65, 130),
    ("mid", 130, 330),
    ("upper-mid", 330, 660),
    ("high", 660, 1000),
    ("above-range", 1000, 1600),
]


def band_of(hz: float) -> str | None:
    for name, lo, hi in BANDS:
        if lo <= hz < hi:
            return name
    return None


def _annotate_two_pass(audio, hop_length: int, librosa, np):
    """
    Coarse pass to locate the range, fine pass to measure it.

    See PYIN_RESOLUTION for why. Returns (f0, voiced_flag) from the fine pass.
    """
    coarse, _, _ = librosa.pyin(
        audio, fmin=FMIN_HZ, fmax=FMAX_HZ, sr=CAPTURE_RATE,
        hop_length=hop_length, resolution=COARSE_RESOLUTION,
    )
    observed = coarse[np.isfinite(coarse)]
    # Robust percentiles, not min/max. The coarse pass makes occasional octave
    # errors, and a single spurious frame an octave up doubles the search range
    # for the fine pass — measured: one female recording reported 251-1390 Hz
    # from a coarse pass whose bulk sat under 900 Hz, and the fine pass over the
    # padded range took minutes instead of seconds. Trimming 1% off each end
    # keeps the range honest about where the singing actually is; the padding
    # below then restores room for the fine pass to disagree.
    if observed.size >= 100:
        observed = observed[(observed >= np.percentile(observed, 1)) & (observed <= np.percentile(observed, 99))]
    if observed.size == 0:
        # nothing pitched found at all; let the fine pass confirm over the full
        # range rather than silently reporting an empty contour from a guess
        lo, hi = FMIN_HZ, FMAX_HZ
    else:
        pad = 2 ** (RANGE_PAD_SEMITONES / 12)
        lo = max(FMIN_HZ, float(observed.min()) / pad)
        hi = min(FMAX_HZ, float(observed.max()) * pad)
        if hi <= lo * 1.05:  # degenerate range, e.g. a single steady note
            lo, hi = max(FMIN_HZ, lo / 2), min(FMAX_HZ, hi * 2)

    f0, voiced_flag, _ = librosa.pyin(
        audio, fmin=lo, fmax=hi, sr=CAPTURE_RATE,
        hop_length=hop_length, resolution=PYIN_RESOLUTION,
    )
    return f0, voiced_flag


def annotate_file(
    src,
    out_dir,
    recording_id: str,
    label: str,
    category: str,
    provenance: dict,
    conditions: dict,
    sonify: bool = False,
) -> dict:
    """
    Ingest one recording: convert to the capture format, annotate with pYIN,
    write the `<id>.wav` + `<id>.json` pair, and return a summary.

    Extracted from `main` so batch ingesters (`ingest_vocalset.py`) share exactly
    this path — a second copy of the conversion or the annotation call is a
    second thing that can silently diverge from what the corpus contains.

    Raises ValueError with a human-readable reason when the file cannot be used.
    """
    import librosa
    import numpy as np
    import soundfile as sf
    from pathlib import Path as _Path

    src = _Path(src)
    if not src.exists():
        raise ValueError(f"no such file: {src}")

    # Resample to the pipeline's capture rate here rather than in the harness:
    # a resampler in the measurement path would alter the signal before the
    # detector sees it, and its artefacts would be indistinguishable from the
    # detector's own errors.
    audio, _ = librosa.load(str(src), sr=CAPTURE_RATE, mono=True)
    if audio.size == 0:
        raise ValueError("the file decoded to zero samples")

    peak = float(np.max(np.abs(audio)))
    if peak < 1e-4:
        raise ValueError(f"effectively silent (peak {peak:.2e})")

    hop_length = int(round(HOP_SEC * CAPTURE_RATE))
    f0, voiced_flag = _annotate_two_pass(audio, hop_length, librosa, np)
    contour = [None if not v or not np.isfinite(x) else round(float(x), 3) for x, v in zip(f0, voiced_flag)]
    voiced = [c for c in contour if c is not None]
    if not voiced:
        raise ValueError("pYIN found no pitched content")

    out_dir = _Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    sf.write(str(out_dir / f"{recording_id}.wav"), audio, CAPTURE_RATE, subtype="PCM_16")

    metadata = {
        "id": recording_id,
        "label": label,
        "category": category,
        "provenance": provenance,
        "conditions": conditions,
        "sampleRateHz": CAPTURE_RATE,
        "annotation": {
            "method": "pyin",
            # Only a human may set this to true, after listening to --sonify.
            "verified": False,
            "hopSec": HOP_SEC,
            "f0Hz": contour,
            # what this annotation cannot resolve, so the benchmark can say so
            "annotatorErrorCents": annotator_error_cents(),
        },
    }
    (out_dir / f"{recording_id}.json").write_text(json.dumps(metadata, indent=2) + "\n")

    if sonify:
        sonified = _sonify(f0, len(audio), CAPTURE_RATE, np)
        sf.write(str(out_dir / f"{recording_id}.verify.wav"),
                 np.stack([audio, sonified * 0.3], axis=-1), CAPTURE_RATE, subtype="PCM_16")

    coverage: dict[str, int] = {}
    for hz in voiced:
        band = band_of(hz)
        if band:
            coverage[band] = coverage.get(band, 0) + 1

    return {
        "id": recording_id,
        "durationSec": len(audio) / CAPTURE_RATE,
        "peak": peak,
        "clipped": peak > 0.999,
        "frames": len(contour),
        "voiced": len(voiced),
        "minHz": min(voiced),
        "maxHz": max(voiced),
        "coverage": coverage,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="recording to ingest (any format soundfile/librosa can read)")
    parser.add_argument("--id", required=True, help="corpus id; becomes the filename")
    parser.add_argument("--label", default="", help="human-readable description")
    parser.add_argument(
        "--category",
        choices=["sustained", "expressive"],
        default="expressive",
        help=(
            "sustained = deliberately straight held notes, the only basis for accuracy figures; "
            "expressive = vibrato, slides, phrasing, measured for tracking only. "
            "Defaults to expressive: contributing to an accuracy number is opt-in."
        ),
    )
    parser.add_argument("--out-dir", default="apps/sing-mvp/benchmark-corpus/real")

    # Provenance is mandatory. The benchmark loader rejects recordings without
    # it, and this project has a documented legal boundary around vocal audio —
    # a corpus of files nobody can account for is exactly what that boundary is
    # meant to prevent.
    parser.add_argument("--source", required=True, help="who recorded it, or which dataset")
    parser.add_argument("--license", required=True, help="terms the material is used under")
    parser.add_argument("--consent", required=True, help="basis on which this voice may be used")

    parser.add_argument("--voice-type", default=None)
    parser.add_argument("--level", default=None, choices=["quiet", "normal", "loud"])
    parser.add_argument("--environment", default=None)
    parser.add_argument("--device", default=None)
    parser.add_argument("--material", default=None)
    parser.add_argument("--challenge", default=None, help="what is deliberately hard about it")
    parser.add_argument("--sonify", action="store_true", help="also write a verification file to listen to")
    args = parser.parse_args()

    try:
        import librosa
        import numpy as np
        import soundfile as sf
    except ImportError as exc:
        print(f"missing dependency: {exc}. pip3 install --user librosa soundfile numpy", file=sys.stderr)
        return 1

    src = Path(args.input)
    if not src.exists():
        print(f"no such file: {src}", file=sys.stderr)
        return 1

    # Resample to the pipeline's capture rate here rather than in the harness:
    # a resampler in the measurement path would alter the signal before the
    # detector sees it, and its artefacts would be indistinguishable from the
    # detector's own errors.
    audio, _ = librosa.load(str(src), sr=CAPTURE_RATE, mono=True)
    if audio.size == 0:
        print("the file decoded to zero samples", file=sys.stderr)
        return 1

    peak = float(np.max(np.abs(audio)))
    if peak < 1e-4:
        print(f"the file is effectively silent (peak {peak:.2e})", file=sys.stderr)
        return 1
    if peak > 0.999:
        print(f"warning: peak {peak:.3f} — the recording may be clipped, which the detector flags", file=sys.stderr)

    hop_length = int(round(HOP_SEC * CAPTURE_RATE))
    f0, voiced_flag, voiced_prob = librosa.pyin(
        audio, fmin=FMIN_HZ, fmax=FMAX_HZ, sr=CAPTURE_RATE, hop_length=hop_length, resolution=PYIN_RESOLUTION
    )

    contour = [None if not v or not np.isfinite(x) else round(float(x), 3) for x, v in zip(f0, voiced_flag)]
    voiced = [c for c in contour if c is not None]
    if not voiced:
        print("pYIN found no pitched content — is this actually singing?", file=sys.stderr)
        return 1

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    wav_path = out_dir / f"{args.id}.wav"
    sf.write(str(wav_path), audio, CAPTURE_RATE, subtype="PCM_16")

    conditions = {
        k: v
        for k, v in {
            "voiceType": args.voice_type,
            "level": args.level,
            "environment": args.environment,
            "device": args.device,
            "material": args.material,
            "challenge": args.challenge,
        }.items()
        if v
    }

    metadata = {
        "id": args.id,
        "label": args.label or args.id,
        "category": args.category,
        "provenance": {"source": args.source, "license": args.license, "consent": args.consent},
        "conditions": conditions,
        "sampleRateHz": CAPTURE_RATE,
        "annotation": {
            "method": "pyin",
            # Only a human may set this to true, after listening to --sonify.
            "verified": False,
            "hopSec": HOP_SEC,
            "f0Hz": contour,
            # what this annotation cannot resolve, so the benchmark can say so
            "annotatorErrorCents": annotator_error_cents(),
        },
    }
    meta_path = out_dir / f"{args.id}.json"
    meta_path.write_text(json.dumps(metadata, indent=2) + "\n")

    coverage: dict[str, int] = {}
    for hz in voiced:
        band = band_of(hz)
        if band:
            coverage[band] = coverage.get(band, 0) + 1

    print(f"wrote {wav_path}")
    print(f"wrote {meta_path}")
    print(f"  {len(audio) / CAPTURE_RATE:.1f}s, {len(voiced)}/{len(contour)} frames voiced, peak {peak:.3f}")
    print(f"  range {min(voiced):.1f}-{max(voiced):.1f} Hz")
    print(f"  category: {args.category}" + ("" if args.category == "sustained" else " (tracking only — not used for accuracy)"))
    print("  band coverage: " + (", ".join(f"{b}={n}" for b, n in coverage.items()) or "none"))
    print('  annotation is UNVERIFIED — listen to the sonification, then set "verified": true')

    if args.sonify:
        sonified = _sonify(f0, len(audio), CAPTURE_RATE, np)
        stereo = np.stack([audio, sonified * 0.3], axis=-1)
        check_path = out_dir / f"{args.id}.verify.wav"
        sf.write(str(check_path), stereo, CAPTURE_RATE, subtype="PCM_16")
        print(f"  wrote {check_path} — original left, annotated pitch right")

    return 0


def _sonify(f0, length: int, sr: int, np):
    """
    A sine that follows the annotated contour, phase-continuous so the ear
    hears pitch rather than a stream of clicks at every frame boundary.
    """
    out = np.zeros(length, dtype=np.float32)
    phase = 0.0
    hop = int(round(HOP_SEC * sr))
    for i, hz in enumerate(f0):
        start = i * hop
        end = min(start + hop, length)
        if end <= start:
            break
        if hz is None or not np.isfinite(hz):
            continue
        n = np.arange(end - start)
        out[start:end] = np.sin(phase + 2 * np.pi * float(hz) * n / sr)
        phase = (phase + 2 * np.pi * float(hz) * (end - start) / sr) % (2 * np.pi)
    return out


if __name__ == "__main__":
    raise SystemExit(main())
