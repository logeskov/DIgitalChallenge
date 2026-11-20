import { describe, expect, it } from 'vitest';
import { href, parseRoute } from './router';

describe('router', () => {
  it('parser ruter', () => {
    expect(parseRoute('')).toEqual({ name: 'menu' });
    expect(parseRoute('#/udfordring/abc')).toEqual({ name: 'challenge', id: 'abc' });
    expect(parseRoute('#/udfordring/abc/2')).toEqual({ name: 'play', id: 'abc', level: 2 });
    expect(parseRoute('#/udfordring/abc/0')).toEqual({ name: 'challenge', id: 'abc' });
  });
  it('href og parseRoute passer sammen', () => {
    const r = { name: 'play', id: 'hex-jagt', level: 3 } as const;
    expect(parseRoute(href(r))).toEqual(r);
  });
});
