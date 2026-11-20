import type { Challenge } from '../types';
import { createUniqueRandom } from '../../core/unique';

/**
 * Pladsholder-udfordring, der viser hvordan en udfordring bruger rammen.
 * Spilleren skal omsætte små decimaltal til binær. Erstattes af rigtige udfordringer.
 */
const QUESTIONS_PER_ROUND = 5;
const MAX_BY_LEVEL = [7, 15, 31];

export const challenge: Challenge = {
  id: 'pladsholder',
  title: 'Binær opvarmning',
  description: 'Pladsholder: skriv små decimaltal som binære tal.',
  category: 'Talsystemer',
  levels: MAX_BY_LEVEL.length,
  mount(el, ctx) {
    const max = MAX_BY_LEVEL[ctx.level - 1] ?? MAX_BY_LEVEL[0];
    let index = 0;
    let score = 0;
    let target = 0;
    // Samme tal må kun komme én gang pr. runde.
    const numbers = createUniqueRandom();

    el.innerHTML = `
      <p class="muted">Niveau ${ctx.level}: tal fra 0 til ${max}. Spørgsmål <span data-q></span> af ${QUESTIONS_PER_ROUND}.</p>
      <p class="question">Skriv <strong data-target></strong> som binært tal</p>
      <form class="answer-row" data-form>
        <input data-input inputmode="numeric" autocomplete="off" aria-label="Dit svar" />
        <button type="submit" class="btn primary">Svar</button>
      </form>
      <p class="feedback" data-feedback role="status"></p>
    `;
    const q = el.querySelector<HTMLElement>('[data-q]')!;
    const targetEl = el.querySelector<HTMLElement>('[data-target]')!;
    const form = el.querySelector<HTMLFormElement>('[data-form]')!;
    const button = form.querySelector('button')!;
    const input = el.querySelector<HTMLInputElement>('[data-input]')!;
    const feedback = el.querySelector<HTMLElement>('[data-feedback]')!;
    let timer: number | undefined;

    const next = () => {
      if (index >= QUESTIONS_PER_ROUND) {
        ctx.finish({ score, maxScore: QUESTIONS_PER_ROUND * 10 });
        return;
      }
      index++;
      target = numbers.int(0, max);
      q.textContent = String(index);
      targetEl.textContent = String(target);
      input.value = '';
      button.disabled = false;
      input.focus();
    };

    const onSubmit = (e: Event) => {
      e.preventDefault();
      if (button.disabled) return;
      const answer = input.value.trim();
      if (!/^[01]+$/.test(answer)) {
        feedback.textContent = 'Brug kun 0 og 1.';
        feedback.className = 'feedback bad';
        return;
      }
      if (parseInt(answer, 2) === target) {
        score += 10;
        ctx.addPoints(10);
        feedback.textContent = 'Rigtigt! +10 point';
        feedback.className = 'feedback good';
      } else {
        feedback.textContent = `Ikke helt. ${target} er ${target.toString(2)} i binær.`;
        feedback.className = 'feedback bad';
      }
      button.disabled = true;
      timer = window.setTimeout(next, 900);
    };

    form.addEventListener('submit', onSubmit);
    next();

    return () => {
      window.clearTimeout(timer);
      form.removeEventListener('submit', onSubmit);
      el.innerHTML = '';
    };
  },
};
