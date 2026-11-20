import type { Challenge, ChallengeContext } from '../types';
import './style.css';
import {
  BASE_NAVN,
  COLOR_MAX_POINTS,
  channelHints,
  colorDistance,
  colorPoints,
  explain,
  formatNumber,
  makeConversionTask,
  makeTargetColor,
  parseAnswer,
  parseHexColor,
  rgbToHex,
  type Base,
  type Rgb,
} from './logic';

const CONVERSION_ROUNDS = 8;
const CONVERSION_POINTS = 10;
const COLOR_ROUNDS = 5;
const COLOR_ATTEMPTS = 3;

const PREFIX: Record<Base, string> = { dec: '', bin: '0b', hex: '0x' };

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { class: cls, ...rest } = props;
  if (cls) el.className = cls;
  Object.assign(el, rest);
  el.append(...children);
  return el;
}

/** Niveau 1: omregning mellem hex, binær og decimal. */
function runConversion(root: HTMLElement, ctx: ChallengeContext): void {
  let round = 0;
  let score = 0;

  const showRound = () => {
    const task = makeConversionTask(round);
    let firstTry = true;

    const input = h('input', {
      class: 'hj-input',
      autocomplete: 'off',
      spellcheck: false,
      placeholder: `Svar i ${BASE_NAVN[task.to]}`,
    });
    input.setAttribute('aria-label', `Svar i ${BASE_NAVN[task.to]}`);
    const feedback = h('p', { class: 'hj-feedback' });
    feedback.setAttribute('aria-live', 'polite');
    const submit = h('button', { class: 'hj-btn', type: 'submit', textContent: 'Tjek' });
    const form = h('form', { class: 'hj-row' }, input, submit);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submit.dataset.next) return next();
      const guess = parseAnswer(input.value, task.to);
      if (guess === null) {
        feedback.className = 'hj-feedback hj-warn';
        feedback.textContent = `Det er ikke et gyldigt ${BASE_NAVN[task.to]} tal.`;
        return;
      }
      if (guess === task.value) {
        const pts = firstTry ? CONVERSION_POINTS : CONVERSION_POINTS / 2;
        score += pts;
        ctx.addPoints(pts);
        feedback.className = 'hj-feedback hj-ok';
        feedback.textContent = `Rigtigt! +${pts} point. ${explain(task)}`;
        finishRound();
      } else if (firstTry) {
        firstTry = false;
        feedback.className = 'hj-feedback hj-warn';
        feedback.textContent =
          task.to === 'dec'
            ? 'Ikke helt. Prøv igen for halve point.'
            : `Ikke helt. Dit svar er ${guess} i decimal. Prøv igen for halve point.`;
        input.select();
      } else {
        feedback.className = 'hj-feedback hj-bad';
        feedback.textContent =
          `Svaret var ${PREFIX[task.to]}${formatNumber(task.value, task.to)}. ${explain(task)}`;
        finishRound();
      }
    });

    const finishRound = () => {
      input.disabled = true;
      submit.textContent = round + 1 < CONVERSION_ROUNDS ? 'Næste' : 'Se resultat';
      submit.dataset.next = '1';
      submit.focus();
    };
    const next = () => {
      round++;
      if (round < CONVERSION_ROUNDS) showRound();
      else showResult();
    };

    root.replaceChildren(
      h('p', { class: 'hj-progress', textContent: `Opgave ${round + 1} af ${CONVERSION_ROUNDS} · ${score} point` }),
      h('p', { class: 'hj-label', textContent: `Omregn fra ${BASE_NAVN[task.from]} til ${BASE_NAVN[task.to]}` }),
      h('p', { class: 'hj-number', textContent: PREFIX[task.from] + formatNumber(task.value, task.from) }),
      form,
      feedback,
    );
    input.focus();
  };

  const showResult = () => {
    const maxScore = CONVERSION_ROUNDS * CONVERSION_POINTS;
    ctx.finish({ score, maxScore });
    resultScreen(root, ctx, score, maxScore, 'Næste niveau er farvejagten: ram en farve med en #RRGGBB-kode.');
  };

  showRound();
}

/** Niveau 2: ram en vist farve med en #RRGGBB-kode. */
function runColors(root: HTMLElement, ctx: ChallengeContext): void {
  let round = 0;
  let score = 0;

  const swatch = (c: Rgb | null, label: string) =>
    h(
      'figure',
      { class: 'hj-swatch-wrap' },
      h('div', { class: 'hj-swatch' + (c ? '' : ' hj-empty') }),
      h('figcaption', { textContent: label }),
    );

  const showRound = () => {
    const target = makeTargetColor(round);
    let attempts = 0;
    let best = 0;

    const targetBox = swatch(target, 'Mål');
    (targetBox.firstChild as HTMLElement).style.background = rgbToHex(target);
    const guessBox = swatch(null, 'Dit gæt');
    const guessEl = guessBox.firstChild as HTMLElement;

    const input = h('input', {
      class: 'hj-input',
      autocomplete: 'off',
      spellcheck: false,
      maxLength: 7,
      placeholder: '#RRGGBB',
    });
    input.setAttribute('aria-label', 'Farvekode');
    const submit = h('button', { class: 'hj-btn', type: 'submit', textContent: 'Gæt' });
    const form = h('form', { class: 'hj-row' }, input, submit);
    const feedback = h('div', { class: 'hj-feedback' });
    feedback.setAttribute('aria-live', 'polite');
    const tries = h('p', { class: 'hj-label' });
    const updateTries = () =>
      (tries.textContent = `Forsøg ${Math.min(attempts + 1, COLOR_ATTEMPTS)} af ${COLOR_ATTEMPTS}`);
    updateTries();

    // Vis farven live mens der tastes.
    input.addEventListener('input', () => {
      const c = parseHexColor(input.value);
      guessEl.classList.toggle('hj-empty', !c);
      guessEl.style.background = c ? rgbToHex(c) : '';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submit.dataset.next) return next();
      const guess = parseHexColor(input.value);
      if (!guess) {
        feedback.className = 'hj-feedback hj-warn';
        feedback.textContent = 'Skriv en farvekode med seks hex-cifre, fx #3366CC.';
        return;
      }
      attempts++;
      const pts = colorPoints(colorDistance(guess, target));
      best = Math.max(best, pts);
      const hints = channelHints(guess, target);
      const done = pts === COLOR_MAX_POINTS || attempts >= COLOR_ATTEMPTS;

      feedback.className = 'hj-feedback ' + (pts === COLOR_MAX_POINTS ? 'hj-ok' : pts > 0 ? 'hj-warn' : 'hj-bad');
      feedback.replaceChildren(
        h('p', {
          textContent:
            pts === COLOR_MAX_POINTS
              ? 'Plet på!'
              : `${rgbToHex(guess)} giver ${pts} point.`,
        }),
        h('ul', {}, ...hints.map((t) => h('li', { textContent: t }))),
      );

      if (done) {
        score += best;
        ctx.addPoints(best);
        feedback.append(
          h('p', { textContent: `Målet var ${rgbToHex(target)}. Du fik ${best} point i denne runde.` }),
        );
        input.disabled = true;
        submit.textContent = round + 1 < COLOR_ROUNDS ? 'Næste farve' : 'Se resultat';
        submit.dataset.next = '1';
        submit.focus();
      } else {
        updateTries();
        input.select();
      }
    });

    const next = () => {
      round++;
      if (round < COLOR_ROUNDS) showRound();
      else {
        const maxScore = COLOR_ROUNDS * COLOR_MAX_POINTS;
        ctx.finish({ score, maxScore });
        resultScreen(root, ctx, score, maxScore, 'Tip: hvert par hex-cifre er én kanal fra 00 (intet) til FF (fuld styrke).');
      }
    };

    root.replaceChildren(
      h('p', { class: 'hj-progress', textContent: `Farve ${round + 1} af ${COLOR_ROUNDS} · ${score} point` }),
      h('p', { class: 'hj-label', textContent: 'Skriv den farvekode, der rammer målfarven.' }),
      h('div', { class: 'hj-swatches' }, targetBox, guessBox),
      tries,
      form,
      feedback,
    );
    input.focus();
  };

  showRound();
}

function resultScreen(root: HTMLElement, ctx: ChallengeContext, score: number, maxScore: number, tip: string) {
  const pct = Math.round((score / maxScore) * 100);
  const back = h('button', { class: 'hj-btn', textContent: 'Tilbage til menuen' });
  back.addEventListener('click', () => ctx.exit());
  root.replaceChildren(
    h('h3', { textContent: pct >= 80 ? 'Flot jagt!' : 'Godt forsøg!' }),
    h('p', { class: 'hj-number', textContent: `${score} / ${maxScore}` }),
    h('p', {
      textContent:
        pct >= 80 ? 'Du har nået 80 % og kan gå videre.' : 'Du skal have mindst 80 % for at låse næste niveau op.',
    }),
    h('p', { class: 'hj-label', textContent: tip }),
    back,
  );
  back.focus();
}

export const challenge: Challenge = {
  id: 'hex-jagt',
  title: 'Hex-jagt',
  description: 'Omregn mellem hex, binær og decimal, og ram derefter farver med #RRGGBB-koder.',
  category: 'Talsystemer',
  levels: 2,
  mount(el, ctx) {
    const root = h('section', { class: 'hexjagt' });
    const title = h('h2', {
      textContent: ctx.level === 1 ? 'Omregning' : 'Farvejagt',
    });
    const body = h('div');
    root.append(title, body);
    el.append(root);
    if (ctx.level === 1) runConversion(body, ctx);
    else runColors(body, ctx);
    return () => root.remove();
  },
};
