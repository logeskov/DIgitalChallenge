import { describe, expect, it } from 'vitest';
import { ProgressStore, playerLevelFor, type KeyValueStore } from './progress';

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('ProgressStore', () => {
  it('gemmer point og læser dem igen', () => {
    const kv = memoryStore();
    new ProgressStore(kv).recordResult('x', 1, { score: 3, maxScore: 5 }, 2, 30);
    expect(new ProgressStore(kv).totalPoints).toBe(30);
  });

  it('kun seneste forsøg pr. niveau tæller i summen', () => {
    const p = new ProgressStore(memoryStore());
    p.recordResult('x', 1, { score: 50, maxScore: 50 }, 3, 50);
    p.recordResult('x', 2, { score: 20, maxScore: 50 }, 3, 20);
    p.recordResult('y', 1, { score: 5, maxScore: 10 }, 1, 70);
    expect(p.totalPoints).toBe(140);
    // Dårligere nyt forsøg på x niveau 1 trækker summen ned, men rekord og oplåsning består.
    p.recordResult('x', 1, { score: 10, maxScore: 50 }, 3, 10);
    expect(p.totalPoints).toBe(100);
    expect(p.lastPoints('x', 1)).toBe(10);
    expect(p.levelRecord('x', 1)?.bestScore).toBe(50);
    expect(p.unlockedLevel('x')).toBe(2);
  });

  it('ignorerer det gamle løbende totalPoints-felt', () => {
    const kv = memoryStore();
    kv.setItem(
      'digitale-udfordringer:fremskridt:v1',
      JSON.stringify({
        totalPoints: 999,
        challenges: { x: { unlockedLevel: 2, levels: { 1: { bestScore: 40, maxScore: 50, completed: true } }, data: {} } },
      }),
    );
    const p = new ProgressStore(kv);
    expect(p.totalPoints).toBe(0);
    expect(p.unlockedLevel('x')).toBe(2);
    expect(p.bestScore('x')).toBe(40);
  });

  it('låser næste niveau op ved mindst 80 %', () => {
    const p = new ProgressStore(memoryStore());
    expect(p.recordResult('x', 1, { score: 30, maxScore: 50 }, 3, 30)).toBe(false);
    expect(p.unlockedLevel('x')).toBe(1);
    expect(p.recordResult('x', 1, { score: 40, maxScore: 50 }, 3, 40)).toBe(true);
    expect(p.unlockedLevel('x')).toBe(2);
    expect(p.levelRecord('x', 1)).toEqual({ bestScore: 40, maxScore: 50, completed: true, lastPoints: 40 });
  });

  it('låser ikke op ud over sidste niveau', () => {
    const p = new ProgressStore(memoryStore());
    expect(p.recordResult('x', 1, { score: 10, maxScore: 10 }, 1, 10)).toBe(false);
    expect(p.unlockedLevel('x')).toBe(1);
    expect(p.completedLevels('x')).toBe(1);
  });

  it('beholder bedste score', () => {
    const p = new ProgressStore(memoryStore());
    p.recordResult('x', 1, { score: 40, maxScore: 50 }, 2, 40);
    p.recordResult('x', 1, { score: 10, maxScore: 50 }, 2, 10);
    expect(p.bestScore('x')).toBe(40);
    expect(p.levelRecord('x', 1)?.completed).toBe(true);
  });

  it('tåler ødelagte data i lagringen', () => {
    const kv = memoryStore();
    kv.setItem('digitale-udfordringer:fremskridt:v1', '{ikke json');
    expect(new ProgressStore(kv).totalPoints).toBe(0);
  });

  it('udfordringsdata er adskilt pr. udfordring', () => {
    const p = new ProgressStore(memoryStore());
    p.setData('a', 'k', 1);
    expect(p.getData('a', 'k', 0)).toBe(1);
    expect(p.getData('b', 'k', 0)).toBe(0);
  });
});

describe('playerLevelFor', () => {
  it('beregner spillerniveau', () => {
    expect(playerLevelFor(0)).toBe(1);
    expect(playerLevelFor(99)).toBe(1);
    expect(playerLevelFor(100)).toBe(2);
    expect(playerLevelFor(300)).toBe(3);
  });
});
