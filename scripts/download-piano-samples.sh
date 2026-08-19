#!/usr/bin/env bash
#
# Downloads Salamander Grand Piano samples from the Tone.js CDN.
# Samples are licensed under CC BY 3.0 (Alexander Holm).
#
# Only fetches the notes needed for the app's vocal range (C2–C6),
# one sample every 3 semitones (the rest are pitch-shifted at runtime).

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/piano"
mkdir -p "$DIR"

BASE_URL="https://tonejs.github.io/audio/salamander"

# Salamander samples every 3 semitones: C, D#, F#, A per octave
NOTES=(
  C2 Ds2 Fs2 A2
  C3 Ds3 Fs3 A3
  C4 Ds4 Fs4 A4
  C5 Ds5 Fs5 A5
  C6
)

echo "Downloading ${#NOTES[@]} piano samples to $DIR ..."

for note in "${NOTES[@]}"; do
  file="${note}.mp3"
  if [ -f "$DIR/$file" ]; then
    echo "  skip $file (exists)"
  else
    echo "  fetch $file"
    curl -sL "$BASE_URL/$file" -o "$DIR/$file"
  fi
done

echo "Done. Total size: $(du -sh "$DIR" | cut -f1)"
