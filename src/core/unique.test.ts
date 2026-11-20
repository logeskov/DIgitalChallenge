import { describe, expect, it } from 'vitest';
import { createUniqueRandom } from './unique';

describe('createUniqueRandom', () => {
  it('giver ingen gentagelser, så længe der er ledige tal', () => {
    for (let run = 0; run < 200; run++) {
      const u = createUniqueRandom();
      const got = Array.from({ length: 8 }, () => u.int(0, 7));
      expect(new Set(got).size).toBe(8);
    }
  });

  it('virker også med en generator der altid giver det samme', () => {
    const u = createUniqueRandom(() => 0);
    expect([u.int(1, 4), u.int(1, 4), u.int(1, 4), u.int(1, 4)].sort()).toEqual([1, 2, 3, 4]);
  });

  it('gentager aldrig det samme tal to gange i træk, når intervallet er brugt op', () => {
    const u = createUniqueRandom();
    let prev = u.int(0, 2);
    for (let i = 0; i < 100; i++) {
      const v = u.int(0, 2);
      expect(v).not.toBe(prev);
      prev = v;
    }
  });

  it('pick undgår sete nøgler', () => {
    const values = [1, 1, 1, 2, 2, 3];
    let i = 0;
    const u = createUniqueRandom();
    const make = () => ({ n: values[i++ % values.length] });
    expect([u.pick(make, (x) => x.n).n, u.pick(make, (x) => x.n).n, u.pick(make, (x) => x.n).n]).toEqual([1, 2, 3]);
  });

  it('reset starter forfra', () => {
    const u = createUniqueRandom(() => 0);
    expect(u.int(5, 9)).toBe(5);
    u.reset();
    expect(u.int(5, 9)).toBe(5);
  });
});
