import { challenges, findChallenge } from '../challenges';
import type { Challenge, ChallengeContext, ChallengeResult } from '../challenges/types';
import { ProgressStore, pointsForPlayerLevel, UNLOCK_THRESHOLD } from '../core/progress';
import { href, parseRoute, type Route } from './router';

export function startApp(root: HTMLElement, progress = new ProgressStore()): void {
  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#/">Digitale Udfordringer</a>
      <div class="stats" data-stats></div>
    </header>
    <main class="view" data-view></main>
  `;
  const statsEl = root.querySelector<HTMLElement>('[data-stats]')!;
  const view = root.querySelector<HTMLElement>('[data-view]')!;
  let cleanup: (() => void) | null = null;

  const renderStats = () => {
    const lvl = progress.playerLevel;
    const from = pointsForPlayerLevel(lvl);
    const to = pointsForPlayerLevel(lvl + 1);
    const pct = Math.round(((progress.totalPoints - from) / (to - from)) * 100);
    statsEl.innerHTML = `
      <span class="pill" title="Spillerens rang ud fra samlede point">Rang ${lvl}</span>
      <span class="pill" title="Samlede point"><strong>${progress.totalPoints}</strong> point</span>
      <span class="xp" title="${to - progress.totalPoints} point til næste niveau"><span style="width:${pct}%"></span></span>
    `;
  };
  progress.subscribe(renderStats);
  renderStats();

  const render = () => {
    cleanup?.();
    cleanup = null;
    view.innerHTML = '';
    const route = parseRoute(location.hash);
    if (route.name === 'menu') {
      renderMenu(view, progress);
      document.title = 'Digitale Udfordringer';
      return;
    }
    const challenge = findChallenge(route.id);
    if (!challenge) {
      view.innerHTML = `<p>Udfordringen findes ikke. <a href="#/">Tilbage til menuen</a></p>`;
      return;
    }
    document.title = `${challenge.title} · Digitale Udfordringer`;
    if (route.name === 'challenge') {
      renderLevels(view, challenge, progress);
    } else {
      cleanup = renderPlay(view, challenge, route, progress);
    }
  };

  window.addEventListener('hashchange', render);
  render();
}

function levelsOf(c: Challenge): number {
  return Math.max(1, c.levels ?? 1);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function renderMenu(view: HTMLElement, progress: ProgressStore): void {
  const groups = new Map<string, Challenge[]>();
  for (const c of challenges) {
    const key = c.category ?? 'Andet';
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  view.innerHTML = `
    <section class="intro">
      <h1>Vælg en udfordring</h1>
      <p class="muted">Træn digitale færdigheder. Klar mindst ${Math.round(UNLOCK_THRESHOLD * 100)} % af et niveau for at låse det næste op.
      Kun dit seneste forsøg på hvert niveau tæller i dine samlede point, så pas på, når du prøver igen.</p>
    </section>
    ${[...groups]
      .map(
        ([cat, list]) => `
      <section>
        <h2 class="category">${esc(cat)}</h2>
        <ul class="cards">
          ${list
            .map((c) => {
              const total = levelsOf(c);
              const done = progress.completedLevels(c.id);
              return `
            <li>
              <a class="card" href="${href({ name: 'challenge', id: c.id })}">
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.description)}</p>
                <div class="card-foot">
                  <span class="dots" aria-label="${done} af ${total} niveauer klaret">
                    ${Array.from({ length: total }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}
                  </span>
                  <span class="muted">Bedste: ${progress.bestScore(c.id)}</span>
                </div>
              </a>
            </li>`;
            })
            .join('')}
        </ul>
      </section>`,
      )
      .join('')}
    <footer class="foot">
      <button class="btn link" data-reset>Nulstil fremskridt</button>
    </footer>
  `;
  view.querySelector('[data-reset]')!.addEventListener('click', () => {
    if (confirm('Vil du slette alle point og alt fremskridt?')) {
      progress.reset();
      renderMenu(view, progress);
    }
  });
}

function renderLevels(view: HTMLElement, c: Challenge, progress: ProgressStore): void {
  const unlocked = progress.unlockedLevel(c.id);
  view.innerHTML = `
    <a class="back" href="#/">← Menu</a>
    <h1>${esc(c.title)}</h1>
    <p class="muted">${esc(c.description)}</p>
    <ol class="levels">
      ${Array.from({ length: levelsOf(c) }, (_, i) => {
        const level = i + 1;
        const rec = progress.levelRecord(c.id, level);
        const open = level <= unlocked;
        const status = rec?.completed ? '✓ Klaret' : open ? 'Åben' : '🔒 Låst';
        const best = rec ? `Bedste ${rec.bestScore}/${rec.maxScore} · ${rec.lastPoints ?? 0} point` : '';
        return open
          ? `<li><a class="level" href="${href({ name: 'play', id: c.id, level })}"><strong>Niveau ${level}</strong><span>${status}</span><span class="muted">${best}</span></a></li>`
          : `<li><span class="level locked"><strong>Niveau ${level}</strong><span>${status}</span></span></li>`;
      }).join('')}
    </ol>
  `;
}

function renderPlay(
  view: HTMLElement,
  c: Challenge,
  route: Extract<Route, { name: 'play' }>,
  progress: ProgressStore,
): (() => void) | null {
  const maxLevel = levelsOf(c);
  if (route.level > maxLevel || route.level > progress.unlockedLevel(c.id)) {
    location.replace(href({ name: 'challenge', id: c.id }));
    return null;
  }
  view.innerHTML = `
    <a class="back" href="${href({ name: 'challenge', id: c.id })}">← Niveauer</a>
    <h1>${esc(c.title)} <span class="muted">· niveau ${route.level}</span></h1>
    <p class="round muted" data-round title="Kun seneste gennemførte forsøg tæller i dine samlede point"></p>
    <div class="stage" data-stage></div>
  `;
  const stage = view.querySelector<HTMLElement>('[data-stage]')!;
  let unmount: (() => void) | null = null;
  let finished = false;
  // Point i den igangværende runde. De erstatter niveauets tidligere point, når runden
  // afsluttes. Forlader spilleren runden før tid, tæller den ikke, og de gamle point står.
  let roundPoints = 0;
  const previousPoints = progress.lastPoints(c.id, route.level);
  const roundEl = view.querySelector<HTMLElement>('[data-round]')!;
  const renderRound = () => {
    roundEl.textContent = `Denne runde: ${roundPoints} point · sidst: ${previousPoints} point`;
  };
  renderRound();

  const ctx: ChallengeContext = {
    level: route.level,
    addPoints: (n) => {
      if (finished || !Number.isFinite(n) || n <= 0) return;
      roundPoints += Math.round(n);
      renderRound();
    },
    finish: (result) => {
      if (finished) return;
      finished = true;
      const unlockedNew = progress.recordResult(c.id, route.level, result, maxLevel, roundPoints);
      unmount?.();
      unmount = null;
      showResult(stage, c, route.level, maxLevel, result, unlockedNew, roundPoints, previousPoints);
    },
    exit: () => {
      location.hash = href({ name: 'challenge', id: c.id });
    },
    getBest: () => progress.bestScore(c.id),
    storage: {
      get: (key, fallback) => progress.getData(c.id, key, fallback),
      set: (key, value) => progress.setData(c.id, key, value),
    },
  };

  const mounted = c.mount(stage, ctx);
  if (!finished) unmount = mounted;
  else mounted();
  return () => {
    finished = true;
    unmount?.();
  };
}

function showResult(
  stage: HTMLElement,
  c: Challenge,
  level: number,
  maxLevel: number,
  result: ChallengeResult,
  unlockedNew: boolean,
  points: number,
  previousPoints: number,
): void {
  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const passed = pct >= UNLOCK_THRESHOLD * 100;
  const nextLevel = unlockedNew || (passed && level < maxLevel) ? level + 1 : null;
  stage.innerHTML = `
    <div class="result ${passed ? 'good' : 'bad'}">
      <p class="big">${result.score} / ${result.maxScore}</p>
      <p>${passed ? 'Godt klaret!' : `Du skal have mindst ${Math.round(UNLOCK_THRESHOLD * 100)} % for at klare niveauet.`}</p>
      ${unlockedNew ? `<p><strong>Niveau ${level + 1} er låst op.</strong></p>` : ''}
      <p class="muted">${pointsChange(points, previousPoints)}</p>
      <div class="actions">
        <a class="btn" href="${href({ name: 'play', id: c.id, level })}" data-retry>Prøv igen</a>
        ${nextLevel ? `<a class="btn primary" href="${href({ name: 'play', id: c.id, level: nextLevel })}">Næste niveau</a>` : ''}
        <a class="btn" href="#/">Menu</a>
      </div>
    </div>
  `;
  // "Prøv igen" peger på samme hash, så vi genindlæser visningen manuelt.
  stage.querySelector('[data-retry]')!.addEventListener('click', (e) => {
    e.preventDefault();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function pointsChange(points: number, previous: number): string {
  const diff = points - previous;
  const sign = diff > 0 ? `+${diff}` : `${diff}`;
  return `Niveauet giver nu ${points} point i din samlede sum (før ${previous}, ${diff === 0 ? 'uændret' : sign}).`;
}
