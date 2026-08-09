#!/usr/bin/env python3
"""
Converts MusicXML (.musicxml / .xml, or compressed .mxl) into the app's
Exercise note format.

Handles: divisions changes, tempo from <sound tempo="…">, rests, ties,
chords (keeps the top note), grace notes (skipped), and multi-part files
(defaults to the first part with notes, or --part P2).

Pure stdlib — no external dependencies.

Usage:
  python3 scripts/musicxml_to_exercise.py <input.musicxml|.mxl> <output.json> [--part ID]
"""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET

STEP_TO_SEMITONE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def load_root(path):
    if path.endswith(".mxl"):
        with zipfile.ZipFile(path) as z:
            # the container points at the real score file
            container = ET.fromstring(z.read("META-INF/container.xml"))
            ns = {"c": "urn:oasis:names:tc:opendocument:xmlns:container"}
            rootfile = container.find(".//c:rootfile", ns)
            name = rootfile.get("full-path") if rootfile is not None else None
            if name is None:
                name = next(n for n in z.namelist() if n.endswith((".xml", ".musicxml")) and not n.startswith("META-INF"))
            return ET.fromstring(z.read(name))
    return ET.parse(path).getroot()


def pitch_to_midi(pitch_el):
    step = pitch_el.findtext("step", "C")
    octave = int(pitch_el.findtext("octave", "4"))
    alter = int(float(pitch_el.findtext("alter", "0") or 0))
    return 12 * (octave + 1) + STEP_TO_SEMITONE[step] + alter


def main():
    argv = sys.argv[1:]
    part_id = None
    if "--part" in argv:
        idx = argv.index("--part")
        part_id = argv[idx + 1]
        del argv[idx:idx + 2]
    if len(argv) < 2:
        raise SystemExit(__doc__)
    in_path, out_path = argv[0], argv[1]

    root = load_root(in_path)
    parts = root.findall(".//part")
    if not parts:
        raise SystemExit("no <part> elements found")
    part = next((p for p in parts if p.get("id") == part_id), None) if part_id else None
    if part is None:
        part = next((p for p in parts if p.find(".//note/pitch") is not None), parts[0])

    divisions = 1
    tempo = 120.0
    notes = []
    t_divs = 0.0  # position in divisions
    prev = None  # last emitted note dict, for ties/chords

    for measure in part.findall("measure"):
        for el in measure:
            if el.tag == "attributes":
                d = el.findtext("divisions")
                if d:
                    divisions = int(d)
            elif el.tag in ("direction", "sound"):
                sound = el if el.tag == "sound" else el.find(".//sound")
                if sound is not None and sound.get("tempo"):
                    tempo = float(sound.get("tempo"))
            elif el.tag == "backup":
                t_divs -= float(el.findtext("duration", "0"))
            elif el.tag == "forward":
                t_divs += float(el.findtext("duration", "0"))
            elif el.tag == "note":
                if el.find("grace") is not None:
                    continue
                dur_divs = float(el.findtext("duration", "0"))
                is_chord = el.find("chord") is not None
                is_rest = el.find("rest") is not None

                if is_rest:
                    t_divs += dur_divs
                    prev = None
                    continue

                pitch_el = el.find("pitch")
                if pitch_el is None:
                    t_divs += dur_divs
                    continue
                midi = pitch_to_midi(pitch_el)

                if is_chord:
                    # same onset as the previous note — keep the higher pitch
                    if prev is not None and midi > prev["midi"]:
                        prev["midi"] = midi
                    continue

                sec_per_div = (60.0 / tempo) / divisions
                start = t_divs * sec_per_div
                duration = dur_divs * sec_per_div

                tied_stop = any(t.get("type") == "stop" for t in el.findall("tie"))
                if tied_stop and prev is not None and prev["midi"] == midi:
                    prev["duration"] = round(prev["duration"] + duration, 3)
                else:
                    prev = {"midi": midi, "start": round(start, 3), "duration": round(duration, 3)}
                    lyric = el.findtext("lyric/text")
                    if lyric:
                        prev["lyric"] = lyric
                    notes.append(prev)

                t_divs += dur_divs

    if not notes:
        raise SystemExit("no pitched notes found")

    # normalize so the phrase starts at 0
    origin = notes[0]["start"]
    for n in notes:
        n["start"] = round(n["start"] - origin, 3)

    out = {"bpm": round(tempo), "notes": notes}
    with open(out_path, "w") as f:
        json.dump(out, f, indent=1)

    lo = min(n["midi"] for n in notes)
    hi = max(n["midi"] for n in notes)
    total = notes[-1]["start"] + notes[-1]["duration"]
    print(f"{len(notes)} notes · {total:.1f}s · MIDI range {lo}-{hi} · {round(tempo)} BPM")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
