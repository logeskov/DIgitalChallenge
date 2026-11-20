import type { Challenge, ChallengeContext } from '../types';
import {
  LEVELS, PASS_THRESHOLD, TASKS_PER_ROUND, bitsToValue, groupNibbles, makeRound,
  parseBinary, parseDecimal, scoreFor, toBinary, type Level, type Task,
} from './logic';
import './style.css';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {}, ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

/** "1011" → "8 + 2 + 1 = 11" */
function explain(value: number, bits: number): string {
  const parts: number[] = [];
  for (let i = bits - 1; i >= 0; i--) if (value & (1 << i)) parts.push(2 ** i);
  if (parts.length <= 1) return `${groupNibbles(toBinary(value, bits))} = ${value}`;
  return `${groupNibbles(toBinary(value, bits))} = ${parts.join(' + ')} = ${value}`;
}

function mount(container: HTMLElement, ctx: ChallengeContext): () => void {
  const levelIndex = Math.min(Math.max(ctx.level, 1), LEVELS.length) - 1;
  const level: Level = LEVELS[levelIndex];
  const root = el('div', { className: 'bd' });
  container.append(root);

  let timer: number | undefined;
  let tasks: Task[] = [];
  let index = 0;
  let correct = 0;
  let points = 0;

  const stopTimer = () => { if (timer !== undefined) { clearInterval(timer); timer = undefined; } };

  function startRound() {
    tasks = makeRound(level.bits);
    index = 0; correct = 0; points = 0;
    showIntro();
  }

  function showIntro() {
    root.replaceChildren(
      el('p', { className: 'bd-level' }, level.name),
      el('p', {}, `Du får ${TASKS_PER_ROUND} opgaver. Nogle gange skal du omregne fra binær til decimal, andre gange den anden vej. ` +
        `Du har ${level.seconds} sekunder til hver. Svar rigtigt på mindst ${PASS_THRESHOLD} for at låse næste niveau op.`),
      el('p', { className: 'bd-hint' }, level.clickableBits
        ? 'Tip: Klik på en bit for at tænde eller slukke den. Hver bit er dobbelt så meget værd som bitten til højre for den.'
        : 'Tip: Skriv binære tal med 0 og 1. Du må gerne bruge mellemrum, fx 1010 0011.'),
      el('div', { className: 'bd-actions' },
        el('button', { className: 'bd-btn bd-primary', onclick: showTask }, 'Start'),
      ),
    );
  }

  function header(): HTMLElement {
    return el('div', { className: 'bd-header' },
      el('span', {}, level.name),
      el('span', {}, `Opgave ${index + 1} af ${TASKS_PER_ROUND}`),
      el('span', {}, `${points} point`),
    );
  }

  function bitRow(values: boolean[], clickable: boolean, onChange?: () => void): HTMLElement {
    const row = el('div', { className: `bd-bits bd-bits-${level.bits}` });
    values.forEach((on, i) => {
      const weight = 2 ** (values.length - 1 - i);
      const cell = el('div', { className: 'bd-cell' });
      if (level.showPlaceValues) cell.append(el('span', { className: 'bd-weight' }, String(weight)));
      const bit = el(clickable ? 'button' : 'span', { className: `bd-bit${on ? ' on' : ''}` }, on ? '1' : '0');
      if (clickable) {
        const b = bit as HTMLButtonElement;
        b.type = 'button';
        b.setAttribute('aria-label', `Bit med værdien ${weight}`);
        b.setAttribute('aria-pressed', String(on));
        b.onclick = () => {
          values[i] = !values[i];
          b.classList.toggle('on', values[i]);
          b.textContent = values[i] ? '1' : '0';
          b.setAttribute('aria-pressed', String(values[i]));
          onChange?.();
        };
      }
      cell.append(bit);
      // Lidt luft mellem hver nibble.
      if (i % 4 === 3 && i !== values.length - 1) cell.classList.add('bd-nibble-end');
      row.append(cell);
    });
    return row;
  }

  function showTask() {
    const task = tasks[index];
    let answered = false;
    let secondsLeft = level.seconds;

    const timeBar = el('div', { className: 'bd-timebar' });
    const timeFill = el('div', { className: 'bd-timefill' });
    const timeText = el('span', { className: 'bd-timetext' }, `${secondsLeft} s`);
    timeBar.append(timeFill);
    const feedback = el('div', { className: 'bd-feedback', role: 'status' } as Partial<HTMLDivElement>);
    const body = el('div', { className: 'bd-task' });
    const submitBtn = el('button', { className: 'bd-btn bd-primary', type: 'submit' }, 'Svar');
    const form = el('form', { className: 'bd-form' });
    let readAnswer: () => number | null;
    let focusTarget: HTMLElement | null = null;

    if (task.direction === 'bin-to-dec') {
      body.append(el('p', { className: 'bd-question' }, 'Hvilket decimaltal er dette binære tal?'));
      const bits = toBinary(task.value, task.bits).split('').map((c) => c === '1');
      body.append(bitRow(bits, false));
      const input = el('input', {
        className: 'bd-input', type: 'text', inputMode: 'numeric', autocomplete: 'off',
        placeholder: 'Decimaltal',
      });
      input.setAttribute('aria-label', 'Dit svar som decimaltal');
      form.append(input, submitBtn);
      readAnswer = () => parseDecimal(input.value);
      focusTarget = input;
    } else {
      body.append(el('p', { className: 'bd-question' }, 'Skriv dette tal binært:'),
        el('div', { className: 'bd-big' }, String(task.value)));
      if (level.clickableBits) {
        const values = new Array<boolean>(task.bits).fill(false);
        const sum = el('p', { className: 'bd-sum' });
        const updateSum = () => { sum.textContent = `Dine bits giver: ${bitsToValue(values)}`; };
        body.append(bitRow(values, true, level.showRunningSum ? updateSum : undefined));
        if (level.showRunningSum) { updateSum(); body.append(sum); }
        form.append(submitBtn);
        readAnswer = () => bitsToValue(values);
      } else {
        const input = el('input', {
          className: 'bd-input bd-input-bin', type: 'text', inputMode: 'numeric', autocomplete: 'off',
          placeholder: `${task.bits} bit med 0 og 1`,
        });
        input.setAttribute('aria-label', 'Dit svar som binært tal');
        form.append(input, submitBtn);
        readAnswer = () => parseBinary(input.value);
        focusTarget = input;
      }
    }

    const finishTask = (given: number | null, timedOut: boolean) => {
      if (answered) return;
      answered = true;
      stopTimer();
      form.querySelectorAll('input,button').forEach((n) => ((n as HTMLInputElement).disabled = true));
      body.querySelectorAll('button').forEach((n) => (n.disabled = true));
      const ok = !timedOut && given === task.value;
      if (ok) {
        correct++;
        const gained = scoreFor(levelIndex, secondsLeft, level.seconds);
        points += gained;
        ctx.addPoints(gained);
        feedback.className = 'bd-feedback ok';
        feedback.replaceChildren(el('strong', {}, `Rigtigt! +${gained} point`), el('div', {}, explain(task.value, task.bits)));
      } else {
        feedback.className = 'bd-feedback bad';
        feedback.replaceChildren(
          el('strong', {}, timedOut ? 'Tiden løb ud.' : 'Ikke helt.'),
          el('div', {}, `Det rigtige svar: ${explain(task.value, task.bits)}`),
        );
      }
      const next = el('button', { className: 'bd-btn bd-primary', type: 'button' },
        index + 1 < TASKS_PER_ROUND ? 'Næste opgave' : 'Se resultat');
      next.onclick = () => {
        index++;
        // Rammen viser resultatet og låser op ved >= 80 % (7 af 8).
        if (index < TASKS_PER_ROUND) showTask();
        else ctx.finish({ score: correct, maxScore: TASKS_PER_ROUND });
      };
      feedback.append(el('div', { className: 'bd-actions' }, next));
      next.focus();
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const given = readAnswer();
      if (given === null) {
        feedback.className = 'bd-feedback warn';
        feedback.textContent = task.direction === 'bin-to-dec'
          ? 'Skriv et decimaltal med cifrene 0-9.'
          : 'Skriv kun 0 og 1.';
        return;
      }
      finishTask(given, false);
    };

    root.replaceChildren(header(), el('div', { className: 'bd-timer' }, timeBar, timeText), body, form, feedback);
    focusTarget?.focus();

    const started = performance.now();
    const tick = () => {
      secondsLeft = Math.max(0, level.seconds - (performance.now() - started) / 1000);
      timeFill.style.width = `${(secondsLeft / level.seconds) * 100}%`;
      timeFill.classList.toggle('low', secondsLeft < level.seconds * 0.25);
      timeText.textContent = `${Math.ceil(secondsLeft)} s`;
      if (secondsLeft <= 0) finishTask(null, true);
    };
    tick();
    timer = window.setInterval(tick, 100);
  }

  startRound();
  return () => { stopTimer(); root.remove(); };
}

export const challenge: Challenge = {
  id: 'binary-decimal',
  title: 'Binær ↔ decimal',
  description: 'Omregn tal mellem binær og decimal på tid. Fra 4 til 8 til 16 bit.',
  category: 'Talsystemer',
  levels: LEVELS.length,
  mount,
};
