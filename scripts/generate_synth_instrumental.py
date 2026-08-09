#!/usr/bin/env python3
"""
Generates a small synthetic instrumental (pad + bass, no drums) to use as the
hardcoded track for the phase 1 prototype. Synthetic on purpose: it lets us
validate the chord/key analysis + pitch-tracking loop without needing a
real-world instrumental file (which the user must supply themselves per
LEGAL_AND_COMPLIANCE.md) before one is on hand.

Progression: C major - G major - A minor - F major (2 loops), a common pop
progression, in 4/4 at 92 BPM.
"""
import math
import struct
import wave

SAMPLE_RATE = 44100
BPM = 92
BEATS_PER_CHORD = 8
SECONDS_PER_BEAT = 60.0 / BPM
CHORD_SECONDS = BEATS_PER_CHORD * SECONDS_PER_BEAT
LOOPS = 2

# MIDI note -> frequency
def midi_to_freq(n):
    return 440.0 * (2.0 ** ((n - 69) / 12.0))

# root position triads, voiced in the octave 3-4 range
PROGRESSION = [
    ("C",  [48, 52, 55, 60]),   # C3 E3 G3 C4
    ("G",  [43, 47, 50, 55]),   # G2 B2 D3 G3
    ("Am", [45, 48, 52, 57]),   # A2 C3 E3 A3
    ("F",  [41, 45, 48, 53]),   # F2 A2 C3 F3
]

def envelope(i, n_samples, attack=0.03, release=0.08):
    t = i / n_samples
    a = attack
    r = release
    if t < a:
        return t / a
    if t > 1 - r:
        return max(0.0, (1 - t) / r)
    return 1.0

def render_chord(midi_notes, duration_s, bass_midi):
    n = int(duration_s * SAMPLE_RATE)
    samples = [0.0] * n
    tone_gain = 1.0 / (len(midi_notes) + 1)
    for note in midi_notes:
        freq = midi_to_freq(note)
        for i in range(n):
            samples[i] += tone_gain * math.sin(2 * math.pi * freq * i / SAMPLE_RATE)
    # soft bass pulse on beats 1 and 3, one octave below the chord root
    bass_freq = midi_to_freq(bass_midi - 12)
    beat_samples = int(SECONDS_PER_BEAT * SAMPLE_RATE)
    for beat in range(0, BEATS_PER_CHORD, 2):
        start = beat * beat_samples
        length = min(beat_samples, n - start)
        for i in range(length):
            env = envelope(i, length, attack=0.01, release=0.5)
            samples[start + i] += 0.5 * env * math.sin(2 * math.pi * bass_freq * i / SAMPLE_RATE)
    # overall chord envelope so chord changes don't click
    for i in range(n):
        samples[i] *= envelope(i, n)
    return samples

def main():
    all_samples = []
    timeline = []
    t = 0.0
    for _ in range(LOOPS):
        for name, notes in PROGRESSION:
            chord_samples = render_chord(notes, CHORD_SECONDS, bass_midi=notes[0])
            all_samples.extend(chord_samples)
            timeline.append({"start": round(t, 3), "end": round(t + CHORD_SECONDS, 3), "chord": name})
            t += CHORD_SECONDS

    peak = max(abs(s) for s in all_samples) or 1.0
    pcm = struct.pack(
        "<%dh" % len(all_samples),
        *[int(max(-1.0, min(1.0, s / peak)) * 32767 * 0.9) for s in all_samples],
    )

    out_path = "apps/web-prototype/audio/instrumental.wav"
    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)

    print(f"Wrote {out_path} ({t:.1f}s, {len(all_samples)} samples)")
    print("Ground-truth progression (for sanity-checking the analysis step):")
    for seg in timeline:
        print(f"  {seg['start']:>6.1f}s - {seg['end']:>6.1f}s  {seg['chord']}")

if __name__ == "__main__":
    main()
