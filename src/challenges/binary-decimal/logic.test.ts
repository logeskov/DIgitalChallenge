import { describe, expect, it } from 'vitest';
import {
  LEVELS, TASKS_PER_ROUND, bitsToValue, groupNibbles, makeRound, parseBinary, parseDecimal,
  randomValue, scoreFor, toBinary,
} from './logic';

describe('binær ↔ decimal logik', () => {
  it('omregner til binær med foranstillede nuller', () => {
    expect(toBinary(5, 4)).toBe('0101');
    expect(toBinary(255, 8)).toBe('11111111');
    expect(toBinary(1, 16)).toBe('0000000000000001');
  });

  it('grupperer i nibbles', () => {
    expect(groupNibbles('10100011')).toBe('1010 0011');
    expect(groupNibbles('0101')).toBe('0101');
  });

  it('læser bits med mest betydende bit først', () => {
    expect(bitsToValue([true, false, true, true])).toBe(11);
    expect(bitsToValue([false, false, false, false])).toBe(0);
  });

  it('fortolker svar', () => {
    expect(parseDecimal(' 42 ')).toBe(42);
    expect(parseDecimal('4a')).toBeNull();
    expect(parseDecimal('')).toBeNull();
    expect(parseBinary('1010 0011')).toBe(163);
    expect(parseBinary('102')).toBeNull();
  });

  it('holder tilfældige tal inden for bitbredden', () => {
    for (const { bits } of LEVELS) {
      for (let i = 0; i < 200; i++) {
        const v = randomValue(bits);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThan(2 ** bits);
      }
    }
  });

  it('laver en runde med begge retninger og unikke tal', () => {
    for (const { bits } of LEVELS) {
      const round = makeRound(bits);
      expect(round).toHaveLength(TASKS_PER_ROUND);
      expect(new Set(round.map((t) => t.direction)).size).toBe(2);
      expect(new Set(round.map((t) => t.value)).size).toBe(TASKS_PER_ROUND);
    }
  });

  it('giver flere point for hurtige svar og højere niveau', () => {
    expect(scoreFor(0, 20, 20)).toBe(200);
    expect(scoreFor(0, 0, 20)).toBe(100);
    expect(scoreFor(2, 0, 45)).toBe(300);
  });
});
