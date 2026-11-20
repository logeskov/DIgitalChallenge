/**
 * Midlertidig testside, indtil den fælles ramme er flettet ind.
 * Rammen erstatter denne fil med menu, point og gemte resultater.
 */
import { challenges } from './challenges';
import type { ChallengeContext } from './challenges/types';

const app = document.getElementById('app')!;
const mem = new Map<string, unknown>();

function start(level: number) {
  app.replaceChildren();
  const ch = challenges[0];
  let cleanup = () => {};
  const ctx: ChallengeContext = {
    level,
    addPoints: (n) => console.log('point', n),
    finish: (r) => console.log('færdig', r),
    exit: () => { cleanup(); menu(); },
    getBest: () => 0,
    storage: {
      get: (k, f) => (mem.has(k) ? (mem.get(k) as typeof f) : f),
      set: (k, v) => void mem.set(k, v),
    },
  };
  cleanup = ch.mount(app, ctx);
}

function menu() {
  app.replaceChildren();
  const ch = challenges[0];
  const h = document.createElement('h1');
  h.textContent = ch.title;
  app.append(h);
  for (let l = 1; l <= (ch.levels ?? 1); l++) {
    const b = document.createElement('button');
    b.textContent = `Niveau ${l}`;
    b.onclick = () => start(l);
    app.append(b, ' ');
  }
}

menu();
