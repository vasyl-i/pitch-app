#!/usr/bin/env python3
"""
Extracts the lead-vocal melody timeline from an original track by using its
backing track as a spectral reference: |STFT(original)| minus |STFT(backing)|
isolates vocal-dominant energy (transiently, in memory — no separated audio is
ever written), then pYIN tracks the melody and the contour is segmented into
notes.

Output: compact JSON [{start, end, midi}] — analysis data only, mirroring the
chord-timeline pattern. See docs/LEGAL_AND_COMPLIANCE.md; reference-melody
matching was re-opened by the owner on 2026-07-17 for MVP development with
user-supplied files.

Usage:
  python3 scripts/extract_melody.py <original> <backing> <out.json>
"""
import json
import sys
import warnings

import librosa
import numpy as np

warnings.filterwarnings("ignore")

SR = 22050
HOP = 512
N_FFT = 2048
FMIN = 130.0  # above bass fundamentals
FMAX = 900.0  # top of a pop vocal range
SUBTRACT_GAIN = 1.15
MIN_NOTE_S = 0.18
MERGE_GAP_S = 0.12
NOTE_TOLERANCE_SEMITONES = 0.8


def align_offset(a, b, sr):
    """Estimate lag of b relative to a via onset-envelope cross-correlation."""
    ea = librosa.onset.onset_strength(y=a[: sr * 60], sr=sr, hop_length=HOP)
    eb = librosa.onset.onset_strength(y=b[: sr * 60], sr=sr, hop_length=HOP)
    n = min(len(ea), len(eb))
    ea, eb = ea[:n] - ea[:n].mean(), eb[:n] - eb[:n].mean()
    corr = np.correlate(ea, eb, mode="full")
    lag_frames = int(np.argmax(corr)) - (n - 1)
    return lag_frames * HOP


def main():
    orig_path, back_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

    orig, _ = librosa.load(orig_path, sr=SR, mono=True)
    back, _ = librosa.load(back_path, sr=SR, mono=True)

    lag = align_offset(orig, back, SR)
    print(f"alignment offset: {lag / SR * 1000:.0f}ms")
    if lag > 0:
        back = np.concatenate([np.zeros(lag), back])
    elif lag < 0:
        back = back[-lag:]
    n = min(len(orig), len(back))
    orig, back = orig[:n], back[:n]

    So = librosa.stft(orig, n_fft=N_FFT, hop_length=HOP)
    Sb = librosa.stft(back, n_fft=N_FFT, hop_length=HOP)
    mag_v = np.maximum(np.abs(So) - SUBTRACT_GAIN * np.abs(Sb), 0.0)
    vocal_ish = librosa.istft(mag_v * np.exp(1j * np.angle(So)), hop_length=HOP)

    print("running pYIN…")
    f0, voiced, prob = librosa.pyin(
        vocal_ish, fmin=FMIN, fmax=FMAX, sr=SR, frame_length=N_FFT, hop_length=HOP
    )
    times = librosa.times_like(f0, sr=SR, hop_length=HOP)
    midi = librosa.hz_to_midi(f0)

    # segment the contour into notes
    segments = []
    cur = None  # [startT, lastT, midis]
    for t, m, v, p in zip(times, midi, voiced, prob):
        ok = v and p is not None and p > 0.4 and not np.isnan(m)
        if ok and cur is not None and abs(m - np.median(cur[2])) <= NOTE_TOLERANCE_SEMITONES and t - cur[1] < MERGE_GAP_S:
            cur[1] = t
            cur[2].append(m)
        else:
            if cur is not None and cur[1] - cur[0] >= MIN_NOTE_S:
                segments.append({"start": round(float(cur[0]), 3), "end": round(float(cur[1]), 3), "midi": round(float(np.median(cur[2])), 2)})
            cur = [t, t, [m]] if ok else None
    if cur is not None and cur[1] - cur[0] >= MIN_NOTE_S:
        segments.append({"start": round(float(cur[0]), 3), "end": round(float(cur[1]), 3), "midi": round(float(np.median(cur[2])), 2)})

    # merge adjacent same-note fragments
    merged = []
    for seg in segments:
        prev = merged[-1] if merged else None
        if prev and seg["start"] - prev["end"] <= MERGE_GAP_S and abs(seg["midi"] - prev["midi"]) <= 0.5:
            prev["end"] = seg["end"]
        else:
            merged.append(dict(seg))

    with open(out_path, "w") as f:
        json.dump({"segments": merged}, f)

    total = sum(s["end"] - s["start"] for s in merged)
    pcs = {}
    for s in merged:
        pc = int(round(s["midi"])) % 12
        pcs[pc] = pcs.get(pc, 0) + 1
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    hist = ", ".join(f"{names[pc]}:{c}" for pc, c in sorted(pcs.items(), key=lambda kv: -kv[1]))
    print(f"{len(merged)} notes, {total:.0f}s voiced, range {min(s['midi'] for s in merged):.0f}-{max(s['midi'] for s in merged):.0f} midi")
    print(f"pitch classes: {hist}")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
