import { describe, expect, it } from 'vitest';
import { parseHexColor, rgbToHex } from '../hex-jagt/logic';
import { LESSON_TITLES, exerciseCount, hexExplain, makeLesson, type Exercise } from './logic';

/** Lille deterministisk tilfældighedsgenerator til tests. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

const LESSONS = LESSON_TITLES.length;
const exercises = (level: number, seed: number): Exercise[] =>
  makeLesson(level, seeded(seed)).steps.flatMap((s) => (s.type === 'exercise' ? [s.exercise] : []));

describe('introduktion til hex og farver', () => {
  it('forklarer hex-tal med sekstenere og enere', () => {
    expect(hexExplain(0x2f)).toBe('2F = 2 · 16 + 15 = 47');
    expect(hexExplain(0xb)).toBe('B = 11');
  });

  it('har 7 lektioner, der hver starter med en forklaring og har mindst 5 øvelser', () => {
    expect(LESSONS).toBe(7);
    for (let level = 1; level <= LESSONS; level++) {
      const lesson = makeLesson(level, seeded(level));
      expect(lesson.steps[0].type).toBe('info');
      expect(exerciseCount(lesson)).toBeGreaterThanOrEqual(5);
    }
  });

  it('giver opgaver med gyldige svar', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (let level = 1; level <= LESSONS; level++) {
        for (const e of exercises(level, seed)) {
          if (e.kind === 'choice') {
            expect(e.options.length).toBeGreaterThanOrEqual(3);
            expect(new Set(e.options).size).toBe(e.options.length);
            expect(e.answer).toBeGreaterThanOrEqual(0);
            expect(e.answer).toBeLessThan(e.options.length);
            if (e.swatchOptions) for (const o of e.options) expect(parseHexColor(o)).not.toBeNull();
          } else if (e.kind === 'color') {
            const t = e.target;
            expect([t.r, t.g, t.b].every((v) => v >= 0 && v <= 255)).toBe(true);
            if (e.input === 'sliders') expect([t.r, t.g, t.b].every((v) => v % 0x33 === 0)).toBe(true);
          } else {
            expect(Number.isInteger(e.answer)).toBe(true);
            expect(e.answer).toBeGreaterThanOrEqual(0);
            expect(e.answer).toBeLessThanOrEqual(255);
          }
          if (e.kind === 'bits') {
            expect(e.answer).toBeLessThan(2 ** e.size);
            expect(parseInt(e.big, 16)).toBe(e.answer);
          }
        }
      }
    }
  });

  it('gentager ikke samme opgave i en lektion', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (let level = 1; level <= LESSONS; level++) {
        const keys = exercises(level, seed).map((e) => JSON.stringify({
          p: e.prompt, big: 'big' in e ? e.big : null, sw: 'swatch' in e ? e.swatch : null,
          t: e.kind === 'color' ? rgbToHex(e.target) : null,
        }));
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('beder kun om en farve, der står i spørgsmålet, når svarmulighederne er farver', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (let level = 1; level <= LESSONS; level++) {
        for (const e of exercises(level, seed)) {
          if (e.kind === 'choice' && e.swatchOptions) expect(e.prompt).toContain(e.options[e.answer]);
        }
      }
    }
  });
});
