import type { Exercise, TargetNote } from './types';

// Build sequential notes from [midi, beats, lyric?] triples at a given tempo.
function seq(bpm: number, pairs: [number, number, string?][]): TargetNote[] {
  const beat = 60 / bpm;
  let t = 0;
  return pairs.map(([midi, beats, lyric]) => {
    const note: TargetNote = { midi, start: +t.toFixed(3), duration: +(beats * beat).toFixed(3), lyric };
    t += beats * beat;
    return note;
  });
}

// note constants (C4 = 60)
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72, G3 = 55;
const FS4 = 66, D5 = 74, E5 = 76;
const A3 = 57, B3 = 59, CS4 = 61, DS4 = 63, GS4 = 68, AS4 = 70, F5 = 77;

// ---- warm-ups (original exercises) --------------------------------------

const cMajorScale: Exercise = {
  id: 'c-major-scale',
  title: 'C major scale',
  source: 'Warm-up · solfège',
  key: 'C major',
  bpm: 100,
  category: 'warmup',
  difficulty: 'easy',
  notes: seq(100, [
    [C4, 1, 'Do'], [D4, 1, 'Re'], [E4, 1, 'Mi'], [F4, 1, 'Fa'], [G4, 1, 'Sol'], [A4, 1, 'La'], [B4, 1, 'Ti'], [C5, 1, 'Do'],
    [B4, 1, 'Ti'], [A4, 1, 'La'], [G4, 1, 'Sol'], [F4, 1, 'Fa'], [E4, 1, 'Mi'], [D4, 1, 'Re'], [C4, 2, 'Do'],
  ]),
};

const majorArpeggio: Exercise = {
  id: 'major-arpeggio',
  title: 'Major arpeggio',
  source: 'Warm-up · triad',
  key: 'C major',
  bpm: 96,
  category: 'warmup',
  difficulty: 'easy',
  notes: seq(96, [
    [C4, 1, 'Do'], [E4, 1, 'Mi'], [G4, 1, 'Sol'], [C5, 1, 'Do'], [G4, 1, 'Sol'], [E4, 1, 'Mi'], [C4, 2, 'Do'],
  ]),
};

// E natural minor — chosen so the one accidental is F♯, which sits on the
// correct staff line (a flat key like C minor would need flat spelling).
const eMinorScale: Exercise = {
  id: 'e-minor-scale',
  title: 'E minor scale',
  source: 'Warm-up · natural minor',
  key: 'E minor',
  bpm: 100,
  category: 'warmup',
  difficulty: 'medium',
  notes: seq(100, [
    [E4, 1, 'La'], [FS4, 1, 'Ti'], [G4, 1, 'Do'], [A4, 1, 'Re'], [B4, 1, 'Mi'], [C5, 1, 'Fa'], [D5, 1, 'Sol'], [E5, 1, 'La'],
    [D5, 1, 'Sol'], [C5, 1, 'Fa'], [B4, 1, 'Mi'], [A4, 1, 'Re'], [G4, 1, 'Do'], [FS4, 1, 'Ti'], [E4, 2, 'La'],
  ]),
};

const minorArpeggio: Exercise = {
  id: 'minor-arpeggio',
  title: 'Minor arpeggio',
  source: 'Warm-up · triad',
  key: 'E minor',
  bpm: 96,
  category: 'warmup',
  difficulty: 'medium',
  notes: seq(96, [
    [E4, 1, 'La'], [G4, 1, 'Do'], [B4, 1, 'Mi'], [E5, 1, 'La'], [B4, 1, 'Mi'], [G4, 1, 'Do'], [E4, 2, 'La'],
  ]),
};

// ---- public-domain melodies --------------------------------------------

const twinkle: Exercise = {
  id: 'twinkle',
  title: 'Twinkle, Twinkle, Little Star',
  source: 'Traditional · public domain',
  key: 'C major',
  bpm: 100,
  category: 'melody',
  difficulty: 'easy',
  notes: seq(100, [
    [C4, 1, 'Twin'], [C4, 1, 'kle'], [G4, 1, 'twin'], [G4, 1, 'kle'], [A4, 1, 'lit'], [A4, 1, 'tle'], [G4, 2, 'star'],
    [F4, 1, 'How'], [F4, 1, 'I'], [E4, 1, 'won'], [E4, 1, 'der'], [D4, 1, 'what'], [D4, 1, 'you'], [C4, 2, 'are'],
  ]),
};

const maryLamb: Exercise = {
  id: 'mary-lamb',
  title: 'Mary Had a Little Lamb',
  source: 'Traditional · public domain',
  key: 'C major',
  bpm: 104,
  category: 'melody',
  difficulty: 'easy',
  notes: seq(104, [
    [E4, 1, 'Ma'], [D4, 1, 'ry'], [C4, 1, 'had'], [D4, 1, 'a'], [E4, 1, 'lit'], [E4, 1, 'tle'], [E4, 2, 'lamb'],
    [D4, 1, 'lit'], [D4, 1, 'tle'], [D4, 2, 'lamb'], [E4, 1, 'lit'], [G4, 1, 'tle'], [G4, 2, 'lamb'],
  ]),
};

const frereJacques: Exercise = {
  id: 'frere-jacques',
  title: 'Frère Jacques',
  source: 'Traditional · public domain',
  key: 'C major',
  bpm: 108,
  category: 'melody',
  difficulty: 'medium',
  notes: seq(108, [
    [C4, 1, 'Frè'], [D4, 1, 're'], [E4, 1, 'Jac'], [C4, 1, 'ques'],
    [C4, 1, 'Frè'], [D4, 1, 're'], [E4, 1, 'Jac'], [C4, 1, 'ques'],
    [E4, 1, 'Dor'], [F4, 1, 'mez'], [G4, 2, 'vous'],
    [E4, 1, 'Dor'], [F4, 1, 'mez'], [G4, 2, 'vous'],
  ]),
};

const odeToJoyNotes = seq(84, [
  [E4, 1, 'Freu'], [E4, 1, 'de'], [F4, 1, 'schö'], [G4, 1, 'ner'],
  [G4, 1, 'Göt'], [F4, 1, 'ter'], [E4, 1, 'fun'], [D4, 1, 'ken'],
  [C4, 1, 'Toch'], [C4, 1, 'ter'], [D4, 1, 'aus'], [E4, 1, 'E'],
  [E4, 1.5, 'ly'], [D4, 0.5, 'si'], [D4, 2, 'um'],
]);

// Ode to Joy — main theme (Beethoven, 1824; public domain).
export const odeToJoy: Exercise = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  source: 'Beethoven · public domain',
  key: 'C major',
  bpm: 84,
  category: 'melody',
  difficulty: 'medium',
  notes: odeToJoyNotes,
};

// ---- advanced library (Premium) -----------------------------------------
//
// Ranges are kept inside roughly G3–F5 so these stay singable for most voices:
// the difficulty here should come from the *intervals*, not from asking a
// beginner to reach notes they don't have yet.
//
// Accidentals are written as sharps throughout, because the staff renderer
// spells every black key as a sharp (see shared/lib/staff). Modes were picked
// to suit that: D Dorian and G Mixolydian need no accidentals at all, and
// C Lydian needs only F#. A flat-side mode would render mis-spelled.

const dDorian: Exercise = {
  id: 'd-dorian-mode',
  title: 'D Dorian',
  source: 'Mode · minor with a raised 6th',
  key: 'D dorian',
  bpm: 92,
  category: 'modes',
  difficulty: 'medium',
  hint: 'Dorian is a minor scale with a bright 6th — listen for the lift on B.',
  notes: seq(92, [
    [D4, 1, 'Re'], [E4, 1, 'Mi'], [F4, 1, 'Fa'], [G4, 1, 'Sol'], [A4, 1, 'La'], [B4, 1, 'Ti'], [C5, 1, 'Do'], [D5, 1, 'Re'],
    [C5, 1, 'Do'], [B4, 1, 'Ti'], [A4, 1, 'La'], [G4, 1, 'Sol'], [F4, 1, 'Fa'], [E4, 1, 'Mi'], [D4, 2, 'Re'],
  ]),
};

const cLydian: Exercise = {
  id: 'c-lydian-mode',
  title: 'C Lydian',
  source: 'Mode · major with a raised 4th',
  key: 'C lydian',
  bpm: 92,
  category: 'modes',
  difficulty: 'hard',
  hint: 'The raised 4th (F#) is the whole character — resist sliding down to F.',
  notes: seq(92, [
    [C4, 1, 'Do'], [D4, 1, 'Re'], [E4, 1, 'Mi'], [FS4, 1, 'Fi'], [G4, 1, 'Sol'], [A4, 1, 'La'], [B4, 1, 'Ti'], [C5, 1, 'Do'],
    [B4, 1, 'Ti'], [A4, 1, 'La'], [G4, 1, 'Sol'], [FS4, 1, 'Fi'], [E4, 1, 'Mi'], [D4, 1, 'Re'], [C4, 2, 'Do'],
  ]),
};

const gMixolydian: Exercise = {
  id: 'g-mixolydian-mode',
  title: 'G Mixolydian',
  source: 'Mode · major with a lowered 7th',
  key: 'G mixolydian',
  bpm: 92,
  category: 'modes',
  difficulty: 'medium',
  hint: 'The 7th stays natural — it should feel unresolved, not like it wants to rise.',
  notes: seq(92, [
    [G3, 1, 'Sol'], [A3, 1, 'La'], [B3, 1, 'Ti'], [C4, 1, 'Do'], [D4, 1, 'Re'], [E4, 1, 'Mi'], [F4, 1, 'Fa'], [G4, 1, 'Sol'],
    [F4, 1, 'Fa'], [E4, 1, 'Mi'], [D4, 1, 'Re'], [C4, 1, 'Do'], [B3, 1, 'Ti'], [A3, 1, 'La'], [G3, 2, 'Sol'],
  ]),
};

const majorSeventhArpeggio: Exercise = {
  id: 'major-seventh-arpeggio',
  title: 'Major 7th arpeggio',
  source: 'Jazz · Cmaj7',
  key: 'C major',
  bpm: 88,
  category: 'jazz',
  difficulty: 'medium',
  hint: 'The 7th (B) sits a half step under the octave — aim just below the Do.',
  notes: seq(88, [
    [C4, 1, 'Do'], [E4, 1, 'Mi'], [G4, 1, 'Sol'], [B4, 1, 'Ti'], [C5, 2, 'Do'],
    [B4, 1, 'Ti'], [G4, 1, 'Sol'], [E4, 1, 'Mi'], [C4, 2, 'Do'],
  ]),
};

const minorSeventhArpeggio: Exercise = {
  id: 'minor-seventh-arpeggio',
  title: 'Minor 7th arpeggio',
  source: 'Jazz · Am7',
  key: 'A minor',
  bpm: 88,
  category: 'jazz',
  difficulty: 'medium',
  notes: seq(88, [
    [A3, 1, 'La'], [C4, 1, 'Do'], [E4, 1, 'Mi'], [G4, 1, 'Sol'], [A4, 2, 'La'],
    [G4, 1, 'Sol'], [E4, 1, 'Mi'], [C4, 1, 'Do'], [A3, 2, 'La'],
  ]),
};

const majorNinthArpeggio: Exercise = {
  id: 'major-ninth-arpeggio',
  title: 'Major 9th arpeggio',
  source: 'Jazz · extended chord · Cmaj9',
  key: 'C major',
  bpm: 84,
  category: 'jazz',
  difficulty: 'hard',
  hint: 'Five notes up before you turn around — keep breath in reserve for the D.',
  notes: seq(84, [
    [C4, 1, 'Do'], [E4, 1, 'Mi'], [G4, 1, 'Sol'], [B4, 1, 'Ti'], [D5, 2, 'Re'],
    [B4, 1, 'Ti'], [G4, 1, 'Sol'], [E4, 1, 'Mi'], [C4, 2, 'Do'],
  ]),
};

const chromaticClimb: Exercise = {
  id: 'chromatic-climb',
  title: 'Chromatic climb',
  source: 'Chromatic · half steps',
  key: 'C chromatic',
  bpm: 76,
  category: 'chromatic',
  difficulty: 'hard',
  hint: 'Half steps are the easiest interval to sing too wide. Think small.',
  notes: seq(76, [
    [C4, 1, 'Ah'], [CS4, 1, 'Ah'], [D4, 1, 'Ah'], [DS4, 1, 'Ah'], [E4, 1, 'Ah'], [F4, 1, 'Ah'], [FS4, 1, 'Ah'], [G4, 2, 'Ah'],
    [FS4, 1, 'Ah'], [F4, 1, 'Ah'], [E4, 1, 'Ah'], [DS4, 1, 'Ah'], [D4, 1, 'Ah'], [CS4, 1, 'Ah'], [C4, 2, 'Ah'],
  ]),
};

const chromaticNeighbours: Exercise = {
  id: 'chromatic-neighbours',
  title: 'Chromatic neighbours',
  source: 'Chromatic · upper & lower',
  key: 'C chromatic',
  bpm: 80,
  category: 'chromatic',
  difficulty: 'hard',
  hint: 'Leave the note and come straight back — the return has to land exactly.',
  notes: seq(80, [
    [C4, 1, 'Ah'], [CS4, 1, 'Ah'], [C4, 2, 'Ah'],
    [E4, 1, 'Ah'], [DS4, 1, 'Ah'], [E4, 2, 'Ah'],
    [G4, 1, 'Ah'], [GS4, 1, 'Ah'], [G4, 2, 'Ah'],
    [C5, 1, 'Ah'], [B4, 1, 'Ah'], [C5, 2, 'Ah'],
  ]),
};

const agilityTriplets: Exercise = {
  id: 'agility-triplets',
  title: 'Agility triplets',
  source: 'Agility · ascending sequence',
  key: 'C major',
  bpm: 120,
  category: 'agility',
  difficulty: 'hard',
  hint: 'Speed comes from relaxation, not effort. Keep the jaw still.',
  notes: seq(120, [
    [C4, 1, 'Ah'], [D4, 1], [E4, 1],
    [D4, 1, 'Ah'], [E4, 1], [F4, 1],
    [E4, 1, 'Ah'], [F4, 1], [G4, 1],
    [F4, 1, 'Ah'], [G4, 1], [A4, 1],
    [G4, 3, 'Ah'],
  ]),
};

const melismaDescent: Exercise = {
  id: 'melisma-descent',
  title: 'Descending melisma',
  source: 'Melisma · one syllable, many notes',
  key: 'C major',
  bpm: 112,
  category: 'agility',
  difficulty: 'hard',
  hint: 'All of this is one “Ah”. Don’t re-articulate — let the pitch do the moving.',
  notes: seq(112, [
    [C5, 1, 'Ah'], [B4, 1], [A4, 1], [G4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 3],
  ]),
};

const riffTurnaround: Exercise = {
  id: 'riff-turnaround',
  title: 'Pentatonic riff',
  source: 'Riff · R&B turnaround',
  key: 'C major',
  bpm: 104,
  category: 'agility',
  difficulty: 'hard',
  notes: seq(104, [
    [G4, 1, 'Ooh'], [A4, 0.5], [G4, 0.5], [E4, 1], [G4, 1],
    [E4, 1, 'Ooh'], [D4, 0.5], [E4, 0.5], [C4, 2],
  ]),
};

const beltPowerFifths: Exercise = {
  id: 'belt-power-fifths',
  title: 'Power fifths',
  source: 'Belt · sustained upper register',
  key: 'C major',
  bpm: 66,
  category: 'belt',
  difficulty: 'hard',
  hint: 'Support from the ribs, not the throat. Stop if it feels tight anywhere.',
  notes: seq(66, [
    [C4, 1, 'Hey'], [G4, 3, 'Hey'],
    [D4, 1, 'Hey'], [A4, 3, 'Hey'],
    [E4, 1, 'Hey'], [B4, 4, 'Hey'],
  ]),
};

const mixVoiceLadder: Exercise = {
  id: 'mix-voice-ladder',
  title: 'Mix voice ladder',
  source: 'Mix · through the passaggio',
  key: 'C major',
  bpm: 72,
  category: 'belt',
  difficulty: 'hard',
  hint: 'Climb through the break without a gear change — same tone above and below.',
  notes: seq(72, [
    [E4, 2, 'Nay'], [G4, 2, 'Nay'], [A4, 2, 'Nay'], [C5, 2, 'Nay'],
    [D5, 2, 'Nay'], [E5, 2, 'Nay'], [F5, 4, 'Nay'],
  ]),
};

const harmonyThirds: Exercise = {
  id: 'harmony-thirds',
  title: 'Thirds above',
  source: 'Harmony · sing the upper line',
  key: 'C major',
  bpm: 88,
  category: 'harmony',
  difficulty: 'hard',
  hint: 'You sing the harmony line; the accompaniment holds the melody underneath.',
  notes: seq(88, [
    [E4, 2, 'Ah'], [F4, 2, 'Ah'], [G4, 2, 'Ah'], [A4, 2, 'Ah'],
    [G4, 2, 'Ah'], [F4, 2, 'Ah'], [E4, 4, 'Ah'],
  ]),
};

void AS4; // reserved: flat-side modes, once the staff can spell flats

const freeExercises: Exercise[] = [
  cMajorScale,
  majorArpeggio,
  eMinorScale,
  minorArpeggio,
  twinkle,
  maryLamb,
  odeToJoy,
  frereJacques,
];

const premiumExercises: Exercise[] = [
  dDorian,
  cLydian,
  gMixolydian,
  majorSeventhArpeggio,
  minorSeventhArpeggio,
  majorNinthArpeggio,
  chromaticClimb,
  chromaticNeighbours,
  agilityTriplets,
  melismaDescent,
  riffTurnaround,
  beltPowerFifths,
  mixVoiceLadder,
  harmonyThirds,
];

export const exercises: Exercise[] = [...freeExercises, ...premiumExercises];

/** Named `melodyById` rather than `exerciseById` — ear-training already owns
 *  that name for its own drill definitions, and the two are different things. */
export function melodyById(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}
