#!/usr/bin/env python3
"""
Converts a Standard MIDI File into the app's Exercise note format.

Melody extraction is "skyline": at any moment the highest sounding pitch wins,
which is the usual way to pull a lead line out of a possibly-polyphonic file.
Output is the same shape the app's exercise library uses, so a converted file
can be pasted straight into src/entities/exercise/library.ts (or loaded as
JSON once runtime import lands).

Pure stdlib — no external dependencies.

Usage:
  python3 scripts/midi_to_exercise.py <input.mid> <output.json> [--track N]
"""
import json
import struct
import sys


def read_var_len(data, i):
    """MIDI variable-length quantity -> (value, new_index)"""
    value = 0
    while True:
        byte = data[i]
        i += 1
        value = (value << 7) | (byte & 0x7F)
        if not byte & 0x80:
            return value, i


def parse_midi(path):
    with open(path, "rb") as f:
        data = f.read()

    if data[:4] != b"MThd":
        raise SystemExit("not a Standard MIDI File (missing MThd)")
    header_len = struct.unpack(">I", data[4:8])[0]
    fmt, ntracks, division = struct.unpack(">HHH", data[8:14])
    if division & 0x8000:
        raise SystemExit("SMPTE time division is not supported")
    ticks_per_beat = division

    i = 8 + header_len
    tracks = []
    tempo_changes = []  # (tick, microseconds_per_beat)

    for _ in range(ntracks):
        if data[i:i + 4] != b"MTrk":
            break
        length = struct.unpack(">I", data[i + 4:i + 8])[0]
        i += 8
        end = i + length
        tick = 0
        running_status = None
        events = []  # (tick, 'on'/'off', note, velocity)

        while i < end:
            delta, i = read_var_len(data, i)
            tick += delta
            status = data[i]
            if status & 0x80:
                i += 1
                running_status = status
            else:
                status = running_status
            if status is None:
                raise SystemExit("malformed track (running status before any status byte)")

            kind = status & 0xF0

            if status == 0xFF:  # meta
                meta_type = data[i]
                i += 1
                mlen, i = read_var_len(data, i)
                if meta_type == 0x51:  # set tempo
                    tempo_changes.append((tick, int.from_bytes(data[i:i + 3], "big")))
                i += mlen
            elif status in (0xF0, 0xF7):  # sysex
                slen, i = read_var_len(data, i)
                i += slen
            elif kind in (0x80, 0x90):  # note off / note on
                note, vel = data[i], data[i + 1]
                i += 2
                if kind == 0x90 and vel > 0:
                    events.append((tick, "on", note, vel))
                else:
                    events.append((tick, "off", note, vel))
            elif kind in (0xA0, 0xB0, 0xE0):  # 2-byte messages
                i += 2
            elif kind in (0xC0, 0xD0):  # 1-byte messages
                i += 1
            else:
                i += 1

        tracks.append(events)
        i = end

    if not tempo_changes:
        tempo_changes = [(0, 500000)]  # default 120 BPM
    return tracks, ticks_per_beat, sorted(tempo_changes), fmt


def tick_to_seconds(tick, tempo_changes, ticks_per_beat):
    """Walk tempo changes so tempo maps are honored."""
    seconds = 0.0
    last_tick = 0
    uspb = tempo_changes[0][1]
    for change_tick, change_uspb in tempo_changes:
        if change_tick >= tick:
            break
        seconds += (change_tick - last_tick) / ticks_per_beat * (uspb / 1_000_000)
        last_tick, uspb = change_tick, change_uspb
    seconds += (tick - last_tick) / ticks_per_beat * (uspb / 1_000_000)
    return seconds


def skyline(events):
    """Collapse (possibly polyphonic) note events into a monophonic top line."""
    timeline = sorted(events, key=lambda e: (e[0], 0 if e[1] == "off" else 1))
    sounding = {}  # note -> start tick
    segments = []  # (start_tick, end_tick, note)
    current = None  # (note, start_tick)

    for tick, kind, note, _vel in timeline:
        if kind == "on":
            sounding[note] = tick
            if current is None or note > current[0]:
                if current is not None and tick > current[1]:
                    segments.append((current[1], tick, current[0]))
                current = (note, tick)
        else:
            sounding.pop(note, None)
            if current is not None and note == current[0]:
                if tick > current[1]:
                    segments.append((current[1], tick, current[0]))
                # fall back to the highest note still held
                if sounding:
                    top = max(sounding)
                    current = (top, tick)
                else:
                    current = None
    return segments


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    track_arg = next((a for a in sys.argv[1:] if a.startswith("--track")), None)
    if len(args) < 2:
        raise SystemExit(__doc__)
    in_path, out_path = args[0], args[1]

    tracks, tpb, tempo_changes, fmt = parse_midi(in_path)
    note_tracks = [(idx, t) for idx, t in enumerate(tracks) if any(e[1] == "on" for e in t)]
    if not note_tracks:
        raise SystemExit("no note events found")

    if track_arg:
        want = int(track_arg.split("=")[1] if "=" in track_arg else sys.argv[sys.argv.index(track_arg) + 1])
        chosen = dict(note_tracks)[want]
    elif fmt == 0 or len(note_tracks) == 1:
        chosen = note_tracks[0][1]
    else:
        # heuristic: the melody track usually has the highest average pitch
        def avg_pitch(t):
            ons = [e[2] for e in t if e[1] == "on"]
            return sum(ons) / len(ons) if ons else 0
        chosen = max((t for _, t in note_tracks), key=avg_pitch)

    segments = skyline(chosen)
    if not segments:
        raise SystemExit("no melody extracted")

    origin = segments[0][0]
    notes = []
    for start_tick, end_tick, note in segments:
        start = tick_to_seconds(start_tick - origin, tempo_changes, tpb)
        end = tick_to_seconds(end_tick - origin, tempo_changes, tpb)
        if end - start < 0.05:  # drop grace-note artifacts
            continue
        notes.append({"midi": note, "start": round(start, 3), "duration": round(end - start, 3)})

    bpm = round(60_000_000 / tempo_changes[0][1])
    out = {"bpm": bpm, "notes": notes}
    with open(out_path, "w") as f:
        json.dump(out, f, indent=1)

    lo = min(n["midi"] for n in notes)
    hi = max(n["midi"] for n in notes)
    total = notes[-1]["start"] + notes[-1]["duration"]
    print(f"{len(notes)} notes · {total:.1f}s · MIDI range {lo}-{hi} · {bpm} BPM")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
