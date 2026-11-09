import assert from 'node:assert/strict';
import test from 'node:test';
import { notation } from '../notation';
import { createPhraseEvaluator } from '../evaluation';

test('notation reads pitches, lengths, rests and lyrics', () => {
  const notes = notation(60, 'C4:1:Do -:2 F#4:0.5 A3:1.5:в_гай');
  assert.deepEqual(notes, [
    { midi: 60, start: 0, duration: 1, lyric: 'Do' },
    { midi: 66, start: 3, duration: 0.5 },
    { midi: 57, start: 3.5, duration: 1.5, lyric: 'в гай' },
  ]);
  assert.throws(() => notation(60, 'H4:1'));
  assert.throws(() => notation(60, 'C4:0'));
});

test('a part-way summary grades only the notes already passed', () => {
  const notes = notation(60, 'C4:1 D4:1 E4:1 F4:1');
  const evaluator = createPhraseEvaluator(notes);
  // sang the first two notes in tune, then left
  for (let t = 0.05; t < 2; t += 0.02) evaluator.addFrame(t, t < 1 ? 60 : 62);
  assert.equal(evaluator.summaryUpTo(0.5), null, 'no note finished yet');
  const partial = evaluator.summaryUpTo(2.4)!;
  assert.equal(partial.results.length, 2, 'the unsung notes are left out, not failed');
  assert.ok(partial.results.every((r) => r.verdict !== 'missed'));
  assert.ok(evaluator.summary().results.length === 4);
});
