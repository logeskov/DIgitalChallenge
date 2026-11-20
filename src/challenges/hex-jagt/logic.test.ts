import { describe, expect, it } from 'vitest';
import {
  channelHints,
  colorDistance,
  colorPoints,
  formatNumber,
  makeConversionTask,
  makeTargetColor,
  parseAnswer,
  parseHexColor,
  rgbToHex,
} from './logic';

describe('parseAnswer', () => {
  it('tolker hex med og uden præfiks', () => {
    expect(parseAnswer('ff', 'hex')).toBe(255);
    expect(parseAnswer('0xFF', 'hex')).toBe(255);
    expect(parseAnswer('#1a', 'hex')).toBe(26);
  });
  it('tolker binær med mellemrum', () => {
    expect(parseAnswer('1010 0101', 'bin')).toBe(0xa5);
    expect(parseAnswer('0b11', 'bin')).toBe(3);
  });
  it('afviser ugyldige tegn', () => {
    expect(parseAnswer('12', 'bin')).toBeNull();
    expect(parseAnswer('g1', 'hex')).toBeNull();
    expect(parseAnswer('', 'dec')).toBeNull();
  });
});

describe('formatNumber', () => {
  it('formaterer i alle baser', () => {
    expect(formatNumber(171, 'hex')).toBe('AB');
    expect(formatNumber(5, 'bin')).toBe('0000 0101');
    expect(formatNumber(42, 'dec')).toBe('42');
  });
});

describe('makeConversionTask', () => {
  it('holder sig inden for en byte', () => {
    for (let r = 0; r < 20; r++) {
      const t = makeConversionTask(r);
      expect(t.value).toBeGreaterThanOrEqual(1);
      expect(t.value).toBeLessThanOrEqual(255);
      expect(t.from).not.toBe(t.to);
    }
  });
});

describe('farver', () => {
  it('omregner frem og tilbage', () => {
    expect(parseHexColor('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(parseHexColor('f80')).toEqual({ r: 255, g: 136, b: 0 });
    expect(parseHexColor('#12345')).toBeNull();
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#FF8000');
  });
  it('giver point efter afstand', () => {
    const t = { r: 0x33, g: 0x66, b: 0x99 };
    expect(colorDistance(t, t)).toBe(0);
    expect(colorPoints(0)).toBe(25);
    expect(colorPoints(colorDistance(t, { r: 0x33, g: 0x66, b: 0xff }))).toBe(0);
    expect(channelHints({ r: 0x33, g: 0x50, b: 0xff }, t)).toEqual([
      'Rød (RR): præcis ✓',
      'Grøn (GG): lidt for lav',
      'Blå (BB): meget for høj',
    ]);
  });
  it('laver lette målfarver i de første runder', () => {
    for (let i = 0; i < 20; i++) {
      const c = makeTargetColor(0);
      for (const v of [c.r, c.g, c.b]) expect(v % 0x33).toBe(0);
    }
  });
});

describe('ingen gentagelser i en runde', () => {
  it('samme tal kommer kun én gang med en fælles UniqueRandom', async () => {
    const { createUniqueRandom } = await import('../../core/unique');
    const { makeConversionTask } = await import('./logic');
    for (let run = 0; run < 100; run++) {
      const u = createUniqueRandom();
      const values = Array.from({ length: 6 }, (_, round) => makeConversionTask(round, Math.random, u).value);
      expect(new Set(values).size).toBe(6);
    }
  });
});
