#!/usr/bin/env python3
"""
Batch-ingest a VocalSet subset into the pitch benchmark's real corpus.

    python3 scripts/ingest_vocalset.py <path-to-extracted-VocalSet> \\
        --context long_tones --technique straight

VocalSet (Wilkins, Seetharaman, Wahl & Pardo, ISMIR 2018; Zenodo 1193957) is
CC BY 4.0. Its layout is `FULL/<singer>/<context>/<technique>/<file>.wav`, and
it is already 44.1 kHz mono — the pipeline's exact capture format — so nothing
is resampled on the way in.

## Why only `long_tones/straight` by default

The benchmark can only derive absolute pitch accuracy from material that is
genuinely still (see `STEADY_SPREAD_CENTS` in the harness): an automatic
annotation of moving pitch disagrees with the detector by several cents purely
because the two integrate differently. VocalSet is the only public dataset that
systematically contains deliberately straight, sustained singing, and
`long_tones/straight` is that material — 100 files, all 20 singers, five vowels
each. Those are ingested as `category: sustained`.

Any other context/technique selected here is ingested as `category: expressive`
and measured for tracking only, never for accuracy.

The annotation is pYIN and is written `verified: false`, exactly as for
owner-recorded material. Nothing about this dataset's provenance makes its
automatic annotation more trustworthy than any other.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from annotate_vocal import annotate_file  # noqa: E402

PROVENANCE = {
    "source": "VocalSet (Wilkins, Seetharaman, Wahl & Pardo, ISMIR 2018), Zenodo record 1193957",
    "license": "CC BY 4.0",
    # Stated as what is actually known. The dataset authors published under
    # CC BY 4.0, which permits commercial use; individual singer consent terms
    # are not separately documented in the release. Recorded here rather than
    # paraphrased into something more reassuring than the evidence supports.
    "consent": (
        "Published by the dataset authors under CC BY 4.0, which permits commercial use. "
        "Individual singer consent terms are not separately documented in the release."
    ),
}

VOWEL_NAMES = {"a": "/a/", "e": "/e/", "i": "/i/", "o": "/o/", "u": "/u/"}

# Long tones held straight are the accuracy basis; everything else is tracking.
SUSTAINED = {("long_tones", "straight")}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("root", help="directory containing the extracted FULL/ tree")
    parser.add_argument("--out-dir", default="apps/sing-mvp/benchmark-corpus/real")
    parser.add_argument("--context", default="long_tones", help="VocalSet context directory, or 'any'")
    parser.add_argument("--technique", default="straight", help="VocalSet technique directory, or 'any'")
    parser.add_argument("--limit-per-singer", type=int, default=0, help="0 = no limit")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    wavs = sorted(root.rglob("*.wav"))
    if not wavs:
        print(f"no .wav files under {root}", file=sys.stderr)
        return 1

    selected: list[tuple[Path, str, str, str]] = []
    per_singer: dict[str, int] = {}
    for wav in wavs:
        parts = wav.parts
        if "__MACOSX" in parts or wav.name.startswith("."):
            continue
        try:
            technique = parts[-2]
            context = parts[-3]
            singer = parts[-4]
        except IndexError:
            continue
        if args.context != "any" and context != args.context:
            continue
        if args.technique != "any" and technique != args.technique:
            continue
        if args.limit_per_singer and per_singer.get(singer, 0) >= args.limit_per_singer:
            continue
        per_singer[singer] = per_singer.get(singer, 0) + 1
        selected.append((wav, singer, context, technique))

    if not selected:
        print("nothing matched the context/technique filter", file=sys.stderr)
        return 1

    print(f"{len(selected)} file(s) from {len(per_singer)} singer(s)")
    if args.dry_run:
        for wav, singer, context, technique in selected[:10]:
            print(f"  {singer}/{context}/{technique}/{wav.name}")
        if len(selected) > 10:
            print(f"  …and {len(selected) - 10} more")
        return 0

    summaries = []
    failures = []
    for wav, singer, context, technique in selected:
        vowel = wav.stem.rsplit("_", 1)[-1]
        recording_id = f"vocalset-{singer}-{context}-{technique}-{vowel}"
        category = "sustained" if (context, technique) in SUSTAINED else "expressive"
        conditions = {
            "voiceType": "female" if singer.startswith("female") else "male",
            "level": "normal",
            "environment": "studio",
            "device": "studio microphone (VocalSet session)",
            "material": f"{context.replace('_', ' ')}, {technique} technique, vowel {VOWEL_NAMES.get(vowel, vowel)}",
            "challenge": f"VocalSet singer {singer}",
        }
        try:
            summary = annotate_file(
                wav,
                args.out_dir,
                recording_id,
                f"VocalSet {singer}, {context.replace('_', ' ')}, {technique}, vowel {VOWEL_NAMES.get(vowel, vowel)}",
                category,
                PROVENANCE,
                conditions,
            )
        except Exception as exc:  # noqa: BLE001 - one bad file must not stop the batch
            failures.append((recording_id, str(exc)))
            print(f"  SKIP {recording_id}: {exc}", file=sys.stderr)
            continue
        summaries.append(summary)
        print(f"  {recording_id}: {summary['durationSec']:.1f}s, "
              f"{summary['voiced']}/{summary['frames']} voiced, "
              f"{summary['minHz']:.0f}-{summary['maxHz']:.0f} Hz"
              + ("  CLIPPED" if summary["clipped"] else ""))

    coverage: dict[str, int] = {}
    for s in summaries:
        for band, n in s["coverage"].items():
            coverage[band] = coverage.get(band, 0) + n

    print(f"\ningested {len(summaries)} recording(s), {len(failures)} skipped")
    print(f"total voiced frames: {sum(s['voiced'] for s in summaries)}")
    print(f"clipped recordings: {sum(1 for s in summaries if s['clipped'])}")
    print("band coverage: " + ", ".join(f"{b}={n}" for b, n in sorted(coverage.items(), key=lambda kv: -kv[1])))
    print('\nAll annotations are UNVERIFIED (pYIN). They may be used for tracking metrics;')
    print('an accuracy claim needs a human to check the sonifications and set "verified": true.')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
