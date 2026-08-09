#!/usr/bin/env python3
"""
One-off chord/key analysis for the phase 1 prototype.

Pipeline (matches ARCHITECTURE.md section 3 "Chord/key analysis worker"):
  chroma feature extraction (librosa) -> key estimation (Krumhansl-Schmuckler)
  -> chord segmentation (template matching + smoothing) -> timeline JSON

This is a one-off script today; in phase 3 the same logic becomes a queued
backend worker that runs once per uploaded instrumental.

Usage:
  python3 scripts/analyze_chord_key.py <audio_file> [output_json]
"""
import json
import sys
import warnings

import librosa
import numpy as np

# Harmless macOS Accelerate/BLAS matmul warning on some float64 shapes; verified
# no NaN/Inf actually reach the output (see label_frames).
warnings.filterwarnings("ignore", message=".*encountered in matmul")

PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Kessler key profiles
KS_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KS_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

MIN_SEGMENT_S = 0.6  # merge chord segments shorter than this into a neighbor


def build_chord_templates():
    """12 major + 12 minor triad templates, indexed 0-23 (root 0-11, then minor 0-11)."""
    templates = []
    labels = []
    for root in range(12):
        maj = np.zeros(12)
        for interval in (0, 4, 7):
            maj[(root + interval) % 12] = 1.0
        templates.append(maj)
        labels.append((PITCH_CLASSES[root], "maj"))
    for root in range(12):
        minr = np.zeros(12)
        for interval in (0, 3, 7):
            minr[(root + interval) % 12] = 1.0
        templates.append(minr)
        labels.append((PITCH_CLASSES[root], "min"))
    return np.array(templates), labels


def estimate_key(mean_chroma):
    best_score, best_label = -np.inf, None
    for root in range(12):
        for profile, quality in ((KS_MAJOR, "major"), (KS_MINOR, "minor")):
            rotated = np.roll(profile, root)
            score = np.corrcoef(mean_chroma, rotated)[0, 1]
            if score > best_score:
                best_score, best_label = score, f"{PITCH_CLASSES[root]} {quality}"
    return best_label, float(best_score)


def label_frames(chroma, templates):
    # cosine similarity between each frame and each of the 24 chord templates
    chroma = chroma.astype(np.float64)  # avoid a spurious Accelerate/BLAS float32 matmul warning
    chroma_norms = np.linalg.norm(chroma, axis=0, keepdims=True)
    norm_chroma = np.divide(chroma, chroma_norms, out=np.zeros_like(chroma), where=chroma_norms > 1e-9)
    norm_templates = templates / np.linalg.norm(templates, axis=1, keepdims=True)
    sims = norm_templates @ norm_chroma  # (24, n_frames)
    return np.argmax(sims, axis=0)


def smooth_labels(labels, frame_times, min_segment_s):
    # mode filter to kill single-frame flicker, then merge short runs into their
    # longer neighbor so the timeline reads as clean chord regions
    window = 5
    smoothed = labels.copy()
    n = len(labels)
    for i in range(n):
        lo, hi = max(0, i - window // 2), min(n, i + window // 2 + 1)
        vals, counts = np.unique(labels[lo:hi], return_counts=True)
        smoothed[i] = vals[np.argmax(counts)]

    # run-length encode
    segments = []
    start_i = 0
    for i in range(1, n + 1):
        if i == n or smoothed[i] != smoothed[start_i]:
            segments.append([start_i, i - 1, smoothed[start_i]])
            start_i = i

    # merge segments shorter than min_segment_s into whichever neighbor is longer
    changed = True
    while changed and len(segments) > 1:
        changed = False
        for i, (s, e, lbl) in enumerate(segments):
            duration = frame_times[e] - frame_times[s] if e < len(frame_times) else 0
            if duration < min_segment_s:
                if i == 0:
                    segments[i + 1][0] = s
                elif i == len(segments) - 1:
                    segments[i - 1][1] = e
                else:
                    prev_len = frame_times[segments[i - 1][1]] - frame_times[segments[i - 1][0]]
                    next_len = frame_times[segments[i + 1][1]] - frame_times[segments[i + 1][0]]
                    if prev_len >= next_len:
                        segments[i - 1][1] = e
                    else:
                        segments[i + 1][0] = s
                del segments[i]
                changed = True
                break
    return segments


def analyze(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    hop_length = 2048
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)
    frame_times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=hop_length)

    key_label, key_confidence = estimate_key(chroma.mean(axis=1))

    templates, chord_labels = build_chord_templates()
    frame_chord_idx = label_frames(chroma, templates)
    segments = smooth_labels(frame_chord_idx, frame_times, MIN_SEGMENT_S)

    duration = float(librosa.get_duration(y=y, sr=sr))
    timeline = []
    for i, (start_i, end_i, label_idx) in enumerate(segments):
        root, quality = chord_labels[label_idx]
        start = float(frame_times[start_i])
        end = float(frame_times[end_i + 1]) if end_i + 1 < len(frame_times) else duration
        timeline.append({
            "start": round(start, 3),
            "end": round(end, 3),
            "chord": f"{root}{'m' if quality == 'min' else ''}",
            "root": root,
            "quality": quality,
        })

    return {
        "key": key_label,
        "key_confidence": round(key_confidence, 3),
        "duration": round(duration, 3),
        "timeline": timeline,
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    audio_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    result = analyze(audio_path)

    print(f"Estimated key: {result['key']}  (confidence {result['key_confidence']})")
    print("Chord timeline:")
    for seg in result["timeline"]:
        print(f"  {seg['start']:>6.1f}s - {seg['end']:>6.1f}s  {seg['chord']}")

    if out_path:
        with open(out_path, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
