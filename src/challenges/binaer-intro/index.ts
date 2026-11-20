import type { Challenge, ChallengeContext } from '../types';
import {
  LESSON_TITLES, POINTS_PER_CORRECT, bitsToValue, exerciseCount, makeLesson, parseBinary, parseDecimal,
  sumExplain, toBinary, type BitView, type Demo, type Exercise, type Info,
} from './logic';
import './style.css';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {}, ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

/** Statisk række af bits, evt. med pladsværdier og en fremhævet bit. */
function bitView(view: BitView): HTMLElement {
  const row = el('div', { className: 'bi-bits' });
  for (let i = 0; i < view.size; i++) {
    const pos = view.size - 1 - i;
    const on = (view.value >> pos) & 1;
    const cell = el('div', { className: 'bi-cell' });
    cell.append(el('span', { className: 'bi-weight' }, view.showWeights ? String(2 ** pos) : ' '));
    const bit = el('span', { className: `bi-bit${on ? ' on' : ''}${view.highlight === pos ? ' mark' : ''}` }, on ? '1' : '0');
    if (view.highlight === pos) bit.setAttribute('aria-label', 'Markeret bit');
    cell.append(bit);
    row.append(cell);
  }
  return row;
}

/** Klikbare bits. Returnerer rækken og en funktion, der læser værdien. */
export function clickableBits(
  size: number, showWeights: boolean, onChange?: (value: number) => void,
): { row: HTMLElement; value: () => number; disable: () => void } {
  const values = new Array<boolean>(size).fill(false);
  const row = el('div', { className: 'bi-bits' });
  const buttons: HTMLButtonElement[] = [];
  values.forEach((_, i) => {
    const weight = 2 ** (size - 1 - i);
    const cell = el('div', { className: 'bi-cell' });
    cell.append(el('span', { className: 'bi-weight' }, showWeights ? String(weight) : ' '));
    const b = el('button', { className: 'bi-bit', type: 'button' }, '0');
    b.setAttribute('aria-label', showWeights ? `Bit med værdien ${weight}` : `Bit nummer ${i + 1} fra venstre`);
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      values[i] = !values[i];
      b.classList.toggle('on', values[i]);
      b.textContent = values[i] ? '1' : '0';
      b.setAttribute('aria-pressed', String(values[i]));
      onChange?.(bitsToValue(values));
    };
    buttons.push(b);
    cell.append(b);
    row.append(cell);
  });
  return { row, value: () => bitsToValue(values), disable: () => buttons.forEach((b) => (b.disabled = true)) };
}

function demo(kind: Demo): HTMLElement {
  const box = el('div', { className: 'bi-demo' });
  if (kind === 'counter') {
    let n = 0;
    const big = el('div', { className: 'bi-big bi-mono' });
    const dec = el('p', { className: 'bi-muted' });
    const render = () => {
      big.textContent = n.toString(2);
      dec.textContent = `= ${n} i titalssystemet`;
    };
    const plus = el('button', { className: 'bi-btn', type: 'button' }, '+1');
    const reset = el('button', { className: 'bi-btn', type: 'button' }, 'Start forfra');
    plus.onclick = () => { n = n >= 31 ? 0 : n + 1; render(); };
    reset.onclick = () => { n = 0; render(); };
    render();
    box.append(big, dec, el('div', { className: 'bi-actions' }, plus, reset));
    return box;
  }
  const size = kind === 'bits1' ? 1 : 4;
  const label = el('p', { className: 'bi-muted', role: 'status' } as Partial<HTMLParagraphElement>);
  const update = (v: number) => {
    label.textContent = size === 1
      ? (v ? 'Tændt: 1' : 'Slukket: 0')
      : `${toBinary(v, size)} er ${v === 0 ? '0' : sumExplain(v, size).split(' = ').slice(1).join(' = ')}`;
  };
  const { row } = clickableBits(size, size > 1, update);
  update(0);
  box.append(row, label);
  return box;
}

function mount(container: HTMLElement, ctx: ChallengeContext): () => void {
  const lesson = makeLesson(ctx.level);
  const total = exerciseCount(lesson);
  const root = el('div', { className: 'bi' });
  container.append(root);

  let stepIndex = 0;
  let exerciseNo = 0;
  let correct = 0;

  function progress(): HTMLElement {
    const dots = el('div', { className: 'bi-steps', 'aria-hidden': 'true' } as Partial<HTMLDivElement>);
    lesson.steps.forEach((s, i) => {
      dots.append(el('i', {
        className: `${s.type === 'info' ? 'info' : 'ex'}${i < stepIndex ? ' done' : ''}${i === stepIndex ? ' now' : ''}`,
      }));
    });
    return el('div', { className: 'bi-header' },
      el('span', { className: 'bi-lesson' }, `Lektion ${Math.min(ctx.level, LESSON_TITLES.length)}: ${lesson.title}`),
      dots,
    );
  }

  function goNext() {
    stepIndex++;
    if (stepIndex < lesson.steps.length) show();
    else ctx.finish({ score: correct, maxScore: total });
  }

  function nextButton(): HTMLButtonElement {
    const last = stepIndex === lesson.steps.length - 1;
    const b = el('button', { className: 'bi-btn bi-primary', type: 'button' }, last ? 'Se resultat' : 'Næste');
    b.onclick = goNext;
    return b;
  }

  function showInfo(info: Info) {
    const text = el('div', { className: 'bi-text' });
    text.innerHTML = info.html; // Fast tekst fra logic.ts, ingen brugerinput.
    const card = el('section', { className: 'bi-info' }, el('h2', {}, info.title), text);
    if (info.example) card.append(bitView(info.example));
    if (info.demo) card.append(demo(info.demo));
    const next = nextButton();
    card.append(el('div', { className: 'bi-actions' }, next));
    root.replaceChildren(progress(), card);
    next.focus({ preventScroll: true });
  }

  function showExercise(task: Exercise) {
    exerciseNo++;
    const body = el('section', { className: 'bi-task' },
      el('p', { className: 'bi-kicker' }, `Øvelse ${exerciseNo} af ${total}`),
      el('p', { className: 'bi-question' }, task.prompt),
    );
    const form = el('form', { className: 'bi-form' });
    const feedback = el('div', { className: 'bi-feedback', role: 'status' } as Partial<HTMLDivElement>);
    const submit = el('button', { className: 'bi-btn bi-primary', type: 'submit' }, 'Tjek svar');
    let read: () => number | null;
    let invalidText = '';
    let focus: HTMLElement | null = null;
    let lock = () => {};

    if ((task.kind === 'binary' || task.kind === 'bits') && task.big) {
      const big = el('div', { className: `bi-big${task.bigBinary ? ' bi-mono' : ''}` }, task.big);
      if (task.bigBinary) big.setAttribute('aria-label', `Binært: ${task.big.split('').join(' ')}`);
      body.append(big);
    }
    if ((task.kind === 'number' || task.kind === 'choice') && task.bits) body.append(bitView(task.bits));

    if (task.kind === 'choice') {
      const group = el('div', { className: 'bi-options', role: 'radiogroup' } as Partial<HTMLDivElement>);
      let picked: number | null = null;
      const buttons = task.options.map((opt, i) => {
        const b = el('button', { className: 'bi-option', type: 'button' }, opt);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.onclick = () => {
          picked = i;
          buttons.forEach((o, j) => { o.classList.toggle('picked', j === i); o.setAttribute('aria-checked', String(j === i)); });
        };
        return b;
      });
      group.append(...buttons);
      body.append(group);
      form.append(submit);
      read = () => picked;
      invalidText = 'Vælg et af svarene først.';
      lock = () => {
        buttons.forEach((b, j) => {
          b.disabled = true;
          if (j === task.answer) b.classList.add('right');
          else if (j === picked) b.classList.add('wrong');
        });
      };
    } else if (task.kind === 'bits') {
      const sum = el('p', { className: 'bi-muted' });
      const bits = clickableBits(task.size, task.showWeights, task.showSum ? (v) => { sum.textContent = `Dine bits giver: ${v}`; } : undefined);
      body.append(bits.row);
      if (task.showSum) { sum.textContent = 'Dine bits giver: 0'; body.append(sum); }
      form.append(submit);
      read = bits.value;
      lock = bits.disable;
    } else {
      const binary = task.kind === 'binary';
      const input = el('input', {
        className: `bi-input${binary ? ' bi-mono' : ''}`, type: 'text', inputMode: 'numeric', autocomplete: 'off',
        placeholder: binary ? 'Kun 0 og 1' : 'Skriv et tal',
      });
      input.setAttribute('aria-label', binary ? 'Dit svar som binært tal' : 'Dit svar som tal');
      form.append(input, submit);
      read = () => (binary ? parseBinary(input.value) : parseDecimal(input.value));
      invalidText = binary ? 'Skriv kun 0 og 1.' : 'Skriv et tal med cifrene 0-9.';
      lock = () => { input.disabled = true; };
      focus = input;
    }

    let answered = false;
    form.onsubmit = (e) => {
      e.preventDefault();
      if (answered) return;
      const given = read();
      if (given === null) {
        feedback.className = 'bi-feedback warn';
        feedback.textContent = invalidText;
        return;
      }
      answered = true;
      lock();
      submit.remove();
      const ok = given === task.answer;
      if (ok) {
        correct++;
        ctx.addPoints(POINTS_PER_CORRECT);
      }
      feedback.className = `bi-feedback ${ok ? 'ok' : 'bad'}`;
      const rightText = task.kind === 'choice' ? task.options[task.answer]
        : task.kind === 'bits' ? toBinary(task.answer, task.size)
        : task.kind === 'binary' ? toBinary(task.answer, 1)
        : String(task.answer);
      feedback.replaceChildren(
        el('strong', {}, ok ? `Rigtigt! +${POINTS_PER_CORRECT} point` : `Ikke helt. Svaret er ${rightText}.`),
        el('div', {}, task.explain),
      );
      const next = nextButton();
      feedback.append(el('div', { className: 'bi-actions' }, next));
      next.focus({ preventScroll: true });
    };

    root.replaceChildren(progress(), body, form, feedback);
    focus?.focus({ preventScroll: true });
  }

  function show() {
    const step = lesson.steps[stepIndex];
    if (step.type === 'info') showInfo(step.info);
    else showExercise(step.exercise);
  }

  show();
  return () => root.remove();
}

export const challenge: Challenge = {
  id: 'binaer-intro',
  title: 'Introduktion til binære tal',
  description: 'Lær totalssystemet fra bunden: korte forklaringer skiftevis med små øvelser. Start her!',
  category: 'Talsystemer',
  levels: LESSON_TITLES.length,
  mount,
};
