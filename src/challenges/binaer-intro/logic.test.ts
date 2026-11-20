import { describe, expect, it } from 'vitest';
import {
  LESSON_TITLES, exerciseCount, makeLesson, parseBinary, placeValues, sumExplain, type Exercise,
} from './logic';

/** Lille deterministisk tilfældighedsgenerator til tests. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const exercises = (level: number, seed: number): Exercise[] =>
  makeLesson(level, seeded(seed)).steps.flatMap((s) => (s.type === 'exercise' ? [s.exercise] : []));

describe('introduktion til binære tal', () => {
  it('forklarer et binært tal som en sum af pladsværdier', () => {
    expect(placeValues(11)).toEqual([8, 2, 1]);
    expect(sumExplain(11, 4)).toBe('1011 = 8 + 2 + 1 = 11');
    expect(sumExplain(4, 4)).toBe('0100 = 4');
    expect(parseBinary('0 111')).toBe(7);
  });

  it('har 5 lektioner, der hver blander forklaringer og øvelser', () => {
    expect(LESSON_TITLES).toHaveLength(5);
    for (let level = 1; level <= 5; level++) {
      const lesson = makeLesson(level, seeded(level));
      expect(lesson.steps[0].type).toBe('info');
      expect(exerciseCount(lesson)).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.filter((s) => s.type === 'info').length).toBeGreaterThanOrEqual(1);
    }
  });

  it('giver opgaver med gyldige svar', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (let level = 1; level <= 5; level++) {
        for (const e of exercises(level, seed)) {
          if (e.kind === 'choice') {
            expect(e.options.length).toBeGreaterThanOrEqual(3);
            expect(new Set(e.options).size).toBe(e.options.length);
            expect(e.answer).toBeGreaterThanOrEqual(0);
            expect(e.answer).toBeLessThan(e.options.length);
          } else {
            expect(Number.isInteger(e.answer)).toBe(true);
            expect(e.answer).toBeGreaterThanOrEqual(0);
          }
          if (e.kind === 'bits') expect(e.answer).toBeLessThan(2 ** e.size);
          if (e.kind === 'bits' && e.bigBinary) expect(parseInt(e.big!, 2)).toBe(e.answer);
        }
      }
    }
  });

  it('gentager ikke samme opgave i en lektion', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (let level = 1; level <= 5; level++) {
        const keys = exercises(level, seed).map((e) =>
          JSON.stringify({ p: e.prompt, b: 'bits' in e ? e.bits : null, g: 'big' in e ? e.big : null }));
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('tæller rigtigt i lektion 5', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const e of exercises(5, seed)) {
        if (e.kind !== 'binary') continue;
        const shown = parseInt(e.big!, 2);
        expect(Math.abs(e.answer - shown)).toBe(1);
        expect(e.answer === shown - 1).toBe(e.prompt.includes('før'));
      }
    }
  });
});
