/**
 * The nine ear-training exercises, declaratively. Each is content + a scorer;
 * every bit of lifecycle, audio and mic behaviour lives in the session engine.
 *
 * Echo-style exercises (echo the note, echo melody, echo the interval, finish
 * the melody) sing immediately after the prompt — a countdown there would
 * erase the very pitch memory being trained. Exercises where singing is
 * detached from the prompt (chord tones, sing the interval, pitch memory)
 * get a real 3-2-1.
 *
 * "Sing the interval" and "Echo the interval" both sound the full interval
 * (never just one tone — an "interval" exercise that plays a single note
 * was confusing) but test different things: "Echo the interval" has you
 * sing immediately, both notes graded (interval *imitation*); "Sing the
 * interval" adds a 3-2-1 before you reproduce just the target note, so the
 * delay tests whether the interval stuck in memory (interval *retention*).
 */
import {
  evaluateChoice,
  evaluateChordTones,
  evaluateMelodyEcho,
  evaluateSingleTarget,
} from '../lib/evaluators';
import {
  chordScript,
  melodyScript,
  noteScript,
  script,
  sequenceScripts,
  type PromptScript,
} from '../lib/promptPlayer';
import {
  CHORD_TYPES,
  chordDegreeName,
  chordMidis,
  generateFinishMelody,
  generateMelody,
  intervalLabel,
  noteName,
  pick,
  randomInt,
  randomMidiAvoiding,
  type ChordTypeId,
} from '../lib/theory';
import { pitchClassOf } from '@/shared/lib/music';
import type { EarRound, ExerciseDefinition, RoundContext } from './types';

/** sing window for one sustained answer note (matches the pre-refactor feel) */
const SINGLE_NOTE_WINDOW_MS = 2400;

/** slow reference arpeggio used when replaying a chord's answer */
function answerArpeggio(midis: number[]): PromptScript {
  return sequenceScripts(
    midis.map((m) => noteScript(m, 0.8)),
    0.15
  );
}

/* ------------------------------------------------------------------ *
 * Echo the Note                                                       *
 * ------------------------------------------------------------------ */

const noteEcho: ExerciseDefinition = {
  id: 'note-echo',
  title: 'Echo the note',
  tagline: 'Hear a note, sing it back in your own octave.',
  needsMic: true,
  rounds: 5,
  difficulties: null,
  makeRound(ctx: RoundContext): EarRound {
    const midi = randomMidiAvoiding(ctx.range.low, ctx.range.high, ctx.previousPc);
    const pc = pitchClassOf(midi);
    return {
      prompt: noteScript(midi),
      instruction: 'Sing it back — any octave',
      answerPc: pc,
      response: {
        kind: 'sing',
        windowMs: SINGLE_NOTE_WINDOW_MS,
        countdownSec: 0,
        evaluate: (frames) => evaluateSingleTarget(frames, pc, noteName(midi)),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Chord Tones                                                         *
 * ------------------------------------------------------------------ */

const CHORD_POOLS: Record<string, ChordTypeId[]> = {
  beginner: ['maj', 'min'],
  intermediate: ['maj', 'min', 'aug', 'dim'],
  advanced: ['maj', 'min', 'aug', 'dim', 'dom7', 'maj7', 'min7'],
};

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const chordTones: ExerciseDefinition = {
  id: 'chord-tones',
  title: 'Chord tones',
  tagline: 'Hear a chord, then sing every note inside it.',
  needsMic: true,
  rounds: 4,
  difficulties: [
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' },
  ],
  defaultDifficulty: 'beginner',
  resultMs: 3200,
  makeRound(ctx: RoundContext): EarRound {
    const level = ctx.difficulty ?? 'beginner';
    const type = CHORD_TYPES[pick(CHORD_POOLS[level] ?? CHORD_POOLS.beginner)];
    const span = type.intervals[type.intervals.length - 1];
    const hi = Math.max(ctx.range.low, ctx.range.high - span);
    const rootMidi = randomMidiAvoiding(ctx.range.low, hi, ctx.previousPc);
    const midis = chordMidis(rootMidi, type.id);

    const order = level === 'advanced' ? 'requested' : level === 'intermediate' ? 'ascending' : 'any';
    const requestedOrder = order === 'requested' ? shuffled(type.intervals.map((_, i) => i)) : undefined;
    const instruction =
      order === 'any'
        ? `Sing every note of the chord — any order (${midis.length} notes)`
        : order === 'ascending'
          ? `Sing every note, from the bottom up (${midis.length} notes)`
          : `Sing: ${requestedOrder!.map((i) => chordDegreeName(type.intervals[i])).join(' · ')}`;

    return {
      prompt: chordScript(midis),
      answerPrompt: answerArpeggio(midis),
      instruction,
      answerPc: pitchClassOf(rootMidi),
      response: {
        kind: 'sing',
        windowMs: 1800 * midis.length + 1400,
        countdownSec: 3,
        evaluate: (frames) =>
          evaluateChordTones(frames, { intervals: type.intervals, rootMidi, order, requestedOrder }),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Major or Minor?                                                     *
 * ------------------------------------------------------------------ */

const majorMinor: ExerciseDefinition = {
  id: 'major-minor',
  title: 'Major or minor?',
  tagline: 'Hear a chord and name its quality. Pure listening — no singing.',
  needsMic: false,
  rounds: 8,
  difficulties: null,
  makeRound(ctx: RoundContext): EarRound {
    const hi = Math.max(ctx.range.low, ctx.range.high - 7);
    const rootMidi = randomMidiAvoiding(ctx.range.low, hi, ctx.previousPc);
    const quality: ChordTypeId = Math.random() < 0.5 ? 'maj' : 'min';
    const midis = chordMidis(rootMidi, quality);
    const qualityWord = quality === 'min' ? 'minor' : 'major';

    return {
      prompt: chordScript(midis),
      answerPrompt: answerArpeggio(midis),
      instruction: 'Major or minor?',
      answerPc: pitchClassOf(rootMidi),
      response: {
        kind: 'choice',
        options: [
          { id: 'maj', label: 'Major' },
          { id: 'min', label: 'Minor' },
        ],
        evaluate: (chosenId) =>
          evaluateChoice({
            chosen: chosenId,
            correct: quality,
            expectedLabel: qualityWord[0].toUpperCase() + qualityWord.slice(1),
            chosenLabel: chosenId === 'maj' ? 'Major' : 'Minor',
            detail: `that was a ${qualityWord} chord on ${noteName(rootMidi)}`,
          }),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Pitch Memory                                                        *
 * ------------------------------------------------------------------ */

const HOLD_SECONDS: Record<string, number> = { easy: 5, medium: 10, hard: 20, expert: 30 };

const pitchMemory: ExerciseDefinition = {
  id: 'pitch-memory',
  title: 'Pitch memory',
  tagline: 'Hear one note, hold it in your mind, sing it after the timer.',
  needsMic: true,
  rounds: 3,
  difficulties: [
    { id: 'easy', label: '5 sec' },
    { id: 'medium', label: '10 sec' },
    { id: 'hard', label: '20 sec' },
    { id: 'expert', label: '30 sec' },
  ],
  defaultDifficulty: 'easy',
  makeRound(ctx: RoundContext): EarRound {
    const midi = randomMidiAvoiding(ctx.range.low, ctx.range.high, ctx.previousPc);
    const pc = pitchClassOf(midi);
    return {
      prompt: noteScript(midi),
      answerPrompt: noteScript(midi),
      instruction: 'Sing the note you remembered',
      answerPc: pc,
      response: {
        kind: 'sing',
        windowMs: SINGLE_NOTE_WINDOW_MS,
        holdSec: HOLD_SECONDS[ctx.difficulty ?? 'easy'] ?? 10,
        countdownSec: 3,
        evaluate: (frames) => evaluateSingleTarget(frames, pc, noteName(midi)),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Echo Short Melodies                                                 *
 * ------------------------------------------------------------------ */

function melodyLength(difficulty: string | null): number {
  if (difficulty === 'advanced') return randomInt(5, 8);
  if (difficulty === 'intermediate') return randomInt(3, 4);
  return 2;
}

const melodyEcho: ExerciseDefinition = {
  id: 'melody-echo',
  title: 'Echo the melody',
  tagline: 'Hear a short phrase and sing it straight back.',
  needsMic: true,
  rounds: 4,
  difficulties: [
    { id: 'beginner', label: '2 notes' },
    { id: 'intermediate', label: '3–4 notes' },
    { id: 'advanced', label: '5–8 notes' },
  ],
  defaultDifficulty: 'beginner',
  resultMs: 3200,
  makeRound(ctx: RoundContext): EarRound {
    const notes = generateMelody(melodyLength(ctx.difficulty), ctx.range);
    const prompt = melodyScript(notes);
    return {
      prompt,
      answerPrompt: prompt,
      instruction: 'Sing it back',
      answerPc: pitchClassOf(notes[notes.length - 1].midi),
      response: {
        kind: 'sing',
        windowMs: Math.round(prompt.length * 1000) + 2500,
        countdownSec: 0,
        evaluate: (frames) => evaluateMelodyEcho(frames, notes),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Odd One Out                                                         *
 * ------------------------------------------------------------------ */

/** chord pairs that differ by exactly one tone — fair "spot the difference" */
const CONFUSABLE_CHORDS: [ChordTypeId, ChordTypeId][] = [
  ['maj', 'min'],
  ['maj', 'aug'],
  ['min', 'dim'],
  ['dom7', 'maj7'],
  ['min7', 'dom7'],
];

const SCALE_RUNS: { label: string; steps: number[] }[] = [
  { label: 'major', steps: [0, 2, 4, 5, 7] },
  { label: 'minor', steps: [0, 2, 3, 5, 7] },
  { label: 'lydian', steps: [0, 2, 4, 6, 7] },
];

function runScript(root: number, steps: number[]): PromptScript {
  return script(steps.map((s, i) => ({ midis: [root + s], at: i * 0.32, duration: 0.3, volume: 0.26 })));
}

function intervalPairScript(root: number, semitones: number): PromptScript {
  return script([
    { midis: [root], at: 0, duration: 0.5, volume: 0.28 },
    { midis: [root + semitones], at: 0.6, duration: 0.5, volume: 0.28 },
  ]);
}

interface OddSet {
  slots: PromptScript[];
  oddIndex: number;
  explanation: string;
}

function makeOddSet(variant: string, range: { low: number; high: number }): OddSet {
  const oddIndex = randomInt(0, 2);

  if (variant === 'chords') {
    const [a, b] = pick(CONFUSABLE_CHORDS);
    const [baseType, oddType] = Math.random() < 0.5 ? [a, b] : [b, a];
    const span = Math.max(...CHORD_TYPES[baseType].intervals, ...CHORD_TYPES[oddType].intervals);
    const root = randomInt(range.low, Math.max(range.low, range.high - span));
    const slots = [0, 1, 2].map((i) => chordScript(chordMidis(root, i === oddIndex ? oddType : baseType), 1.0));
    return {
      slots,
      oddIndex,
      explanation: `two were ${CHORD_TYPES[baseType].label.toLowerCase()} chords — number ${oddIndex + 1} was ${CHORD_TYPES[oddType].label.toLowerCase()}`,
    };
  }

  if (variant === 'scales') {
    const [base, odd] = shuffled(SCALE_RUNS).slice(0, 2);
    const root = randomInt(range.low, Math.max(range.low, range.high - 7));
    const slots = [0, 1, 2].map((i) => runScript(root, i === oddIndex ? odd.steps : base.steps));
    return {
      slots,
      oddIndex,
      explanation: `two runs were ${base.label} — number ${oddIndex + 1} was ${odd.label}`,
    };
  }

  // intervals
  const base = pick([3, 4, 5, 7, 8, 9, 12]);
  let odd = base + pick([-2, -1, 1, 2]);
  odd = Math.min(12, Math.max(1, odd));
  if (odd === base) odd = base - 1;
  const maxSpan = Math.max(base, odd);
  const root = randomInt(range.low, Math.max(range.low, range.high - maxSpan));
  const slots = [0, 1, 2].map((i) => intervalPairScript(root, i === oddIndex ? odd : base));
  return {
    slots,
    oddIndex,
    explanation: `two were ${intervalLabel(base).toLowerCase()}s — number ${oddIndex + 1} was a ${intervalLabel(odd).toLowerCase()}`,
  };
}

const oddOneOut: ExerciseDefinition = {
  id: 'odd-one-out',
  title: 'Odd one out',
  tagline: 'Three sounds — two match, one doesn’t. Which is different?',
  needsMic: false,
  rounds: 6,
  difficulties: [
    { id: 'intervals', label: 'Intervals' },
    { id: 'chords', label: 'Chords' },
    { id: 'scales', label: 'Scales' },
  ],
  defaultDifficulty: 'intervals',
  makeRound(ctx: RoundContext): EarRound {
    const set = makeOddSet(ctx.difficulty ?? 'intervals', ctx.range);
    return {
      prompt: sequenceScripts(set.slots, 0.8),
      answerPrompt: set.slots[set.oddIndex],
      instruction: 'Which one was different?',
      answerPc: set.oddIndex, // not a pitch class; harmless variety seed
      response: {
        kind: 'choice',
        options: [
          { id: '0', label: '1' },
          { id: '1', label: '2' },
          { id: '2', label: '3' },
        ],
        evaluate: (chosenId) =>
          evaluateChoice({
            chosen: chosenId,
            correct: String(set.oddIndex),
            expectedLabel: `Number ${set.oddIndex + 1}`,
            chosenLabel: `Number ${Number(chosenId) + 1}`,
            detail: set.explanation,
          }),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Finish the Melody                                                   *
 * ------------------------------------------------------------------ */

const finishMelody: ExerciseDefinition = {
  id: 'finish-melody',
  title: 'Finish the melody',
  tagline: 'A phrase stops one note early — sing the note that resolves it.',
  needsMic: true,
  rounds: 5,
  difficulties: null,
  resultMs: 2400,
  makeRound(ctx: RoundContext): EarRound {
    const melody = generateFinishMelody(ctx.range);
    const pc = pitchClassOf(melody.answerMidi);
    return {
      prompt: melodyScript(melody.played),
      answerPrompt: melodyScript(melody.full),
      instruction: 'Sing the missing last note',
      answerPc: pc,
      response: {
        kind: 'sing',
        windowMs: SINGLE_NOTE_WINDOW_MS + 400,
        countdownSec: 0,
        evaluate: (frames) => evaluateSingleTarget(frames, pc, noteName(melody.answerMidi)),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Sing the Interval                                                   *
 * ------------------------------------------------------------------ */

interface IntervalTask {
  semitones: number;
  /** 1 = above the reference, -1 = below */
  direction: 1 | -1;
}

const INTERVAL_POOLS: Record<string, IntervalTask[]> = {
  beginner: [
    { semitones: 4, direction: 1 },
    { semitones: 7, direction: 1 },
    { semitones: 12, direction: 1 },
  ],
  intermediate: [
    { semitones: 3, direction: 1 },
    { semitones: 4, direction: 1 },
    { semitones: 5, direction: 1 },
    { semitones: 7, direction: 1 },
    { semitones: 9, direction: 1 },
    { semitones: 7, direction: -1 },
    { semitones: 12, direction: -1 },
  ],
  advanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((s): IntervalTask[] => [
    { semitones: s, direction: 1 },
    { semitones: s, direction: -1 },
  ]),
};

const singInterval: ExerciseDefinition = {
  id: 'sing-interval',
  title: 'Sing the interval',
  tagline: 'Hear a full interval, then sing the target note back from memory.',
  needsMic: true,
  rounds: 5,
  difficulties: [
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' },
  ],
  defaultDifficulty: 'beginner',
  makeRound(ctx: RoundContext): EarRound {
    const task = pick(INTERVAL_POOLS[ctx.difficulty ?? 'beginner'] ?? INTERVAL_POOLS.beginner);
    const refLow = task.direction === 1 ? ctx.range.low : ctx.range.low + task.semitones;
    const refHigh = task.direction === 1 ? ctx.range.high - task.semitones : ctx.range.high;
    const refMidi = randomMidiAvoiding(Math.min(refLow, refHigh), Math.max(refLow, refHigh), ctx.previousPc);
    const targetMidi = refMidi + task.direction * task.semitones;
    const pc = pitchClassOf(targetMidi);
    const dirWord = task.direction === 1 ? 'above' : 'below';
    const label = intervalLabel(task.semitones).toLowerCase();

    return {
      prompt: sequenceScripts([noteScript(refMidi, 0.8), noteScript(targetMidi, 1.2)], 0.15),
      instruction: `Remember it — sing the second note back (a ${label} ${dirWord})`,
      answerPc: pc,
      response: {
        kind: 'sing',
        windowMs: SINGLE_NOTE_WINDOW_MS + 600,
        countdownSec: 3,
        evaluate: (frames) => evaluateSingleTarget(frames, pc, `${noteName(targetMidi)} (${label} ${dirWord})`),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Echo the Interval                                                   *
 * ------------------------------------------------------------------ */

const echoInterval: ExerciseDefinition = {
  id: 'echo-interval',
  title: 'Echo the interval',
  tagline: 'Hear two notes together, then sing that same interval back.',
  needsMic: true,
  rounds: 5,
  difficulties: [
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' },
  ],
  defaultDifficulty: 'beginner',
  resultMs: 3200,
  makeRound(ctx: RoundContext): EarRound {
    const task = pick(INTERVAL_POOLS[ctx.difficulty ?? 'beginner'] ?? INTERVAL_POOLS.beginner);
    const refLow = task.direction === 1 ? ctx.range.low : ctx.range.low + task.semitones;
    const refHigh = task.direction === 1 ? ctx.range.high - task.semitones : ctx.range.high;
    const refMidi = randomMidiAvoiding(Math.min(refLow, refHigh), Math.max(refLow, refHigh), ctx.previousPc);
    const targetMidi = refMidi + task.direction * task.semitones;
    const notes = [
      { midi: refMidi, start: 0, duration: 0.8 },
      { midi: targetMidi, start: 0.95, duration: 0.8 },
    ];
    const prompt = melodyScript(notes);

    return {
      prompt,
      answerPrompt: prompt,
      instruction: 'Sing it back — both notes',
      answerPc: pitchClassOf(targetMidi),
      response: {
        kind: 'sing',
        windowMs: Math.round(prompt.length * 1000) + 2500,
        countdownSec: 0,
        evaluate: (frames) => evaluateMelodyEcho(frames, notes),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Registry                                                            *
 * ------------------------------------------------------------------ */

export const EXERCISES: ExerciseDefinition[] = [
  noteEcho,
  chordTones,
  melodyEcho,
  pitchMemory,
  echoInterval,
  singInterval,
  finishMelody,
  majorMinor,
  oddOneOut,
];

export function exerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find((e) => e.id === id);
}
