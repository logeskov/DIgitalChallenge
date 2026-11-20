import type { Challenge, ChallengeContext } from '../types';
import { clickableBits, el } from '../binaer-intro';
import '../binaer-intro/style.css';
import './style.css';
import { channelHints, colorDistance, parseAnswer, parseHexColor, rgbToHex, type Rgb } from '../hex-jagt/logic';
import {
  BASIC_COLORS, LESSON_TITLES, POINTS_PER_CORRECT, exerciseCount, hex, hexExplain, makeLesson, toBinary,
  type Demo, type Exercise, type Info, type SwatchLabel,
} from './logic';

/** Et farvefelt. */
function swatch(code: string | null, size: 'big' | 'small' = 'big'): HTMLDivElement {
  const box = el('div', { className: `hi-swatch hi-${size}${code ? '' : ' hi-empty'}` });
  if (code) box.style.background = code;
  return box;
}

function labelledSwatch(s: SwatchLabel): HTMLElement {
  return el('figure', { className: 'hi-sample' }, swatch(s.code, 'small'), el('figcaption', { className: 'bi-mono' }, s.label));
}

/** Tre skydere for rød, grøn og blå. */
function sliders(step: number, onChange: (c: Rgb) => void): { box: HTMLElement; value: () => Rgb; disable: () => void } {
  const c: Rgb = { r: 0, g: 0, b: 0 };
  const box = el('div', { className: 'hi-sliders' });
  const inputs: HTMLInputElement[] = [];
  ([['r', 'Rød'], ['g', 'Grøn'], ['b', 'Blå']] as [keyof Rgb, string][]).forEach(([k, name]) => {
    const input = el('input', { type: 'range', min: '0', max: '255', step: String(step), value: '0', className: `hi-range hi-${k}` });
    input.setAttribute('aria-label', name);
    const out = el('span', { className: 'hi-value bi-mono' });
    const show = () => { out.textContent = `${hex(c[k], 2)} (${c[k]})`; };
    input.oninput = () => { c[k] = Number(input.value); show(); onChange({ ...c }); };
    show();
    inputs.push(input);
    box.append(el('label', { className: 'hi-slider' }, el('span', { className: 'hi-name' }, name), input, out));
  });
  return { box, value: () => ({ ...c }), disable: () => inputs.forEach((i) => (i.disabled = true)) };
}

function demo(kind: Demo): HTMLElement {
  const box = el('div', { className: 'bi-demo' });
  const status = () => el('p', { className: 'bi-muted', role: 'status' } as Partial<HTMLParagraphElement>);

  if (kind === 'hexCounter') {
    let n = 0;
    const big = el('div', { className: 'bi-big bi-mono' });
    const dec = el('p', { className: 'bi-muted' });
    const render = () => { big.textContent = hex(n); dec.textContent = `= ${n} i titalssystemet`; };
    const plus = el('button', { className: 'bi-btn', type: 'button' }, '+1');
    const reset = el('button', { className: 'bi-btn', type: 'button' }, 'Start forfra');
    plus.onclick = () => { n = n >= 0x2f ? 0 : n + 1; render(); };
    reset.onclick = () => { n = 0; render(); };
    render();
    box.append(big, dec, el('div', { className: 'bi-actions' }, plus, reset));
  } else if (kind === 'hex2') {
    const digits = [2, 15];
    const label = status();
    const cols = digits.map((_, i) => {
      const shown = el('div', { className: 'bi-big bi-mono hi-digit' });
      const up = el('button', { className: 'bi-btn', type: 'button' }, '▲');
      const down = el('button', { className: 'bi-btn', type: 'button' }, '▼');
      up.setAttribute('aria-label', i === 0 ? 'Sekstener-ciffer op' : 'Ener-ciffer op');
      down.setAttribute('aria-label', i === 0 ? 'Sekstener-ciffer ned' : 'Ener-ciffer ned');
      up.onclick = () => { digits[i] = (digits[i] + 1) % 16; render(); };
      down.onclick = () => { digits[i] = (digits[i] + 15) % 16; render(); };
      return { col: el('div', { className: 'hi-col' }, el('span', { className: 'bi-weight' }, i === 0 ? '16' : '1'), up, shown, down), shown };
    });
    const render = () => {
      cols.forEach((c, i) => (c.shown.textContent = hex(digits[i])));
      const v = digits[0] * 16 + digits[1];
      label.textContent = `${hex(digits[0])}${hex(digits[1])} = ${digits[0]} · 16 + ${digits[1]} = ${v}`;
    };
    render();
    box.append(el('div', { className: 'hi-cols' }, ...cols.map((c) => c.col)), label);
  } else if (kind === 'nibble') {
    const label = status();
    const update = (v: number) => { label.textContent = `${toBinary(v, 4)} = ${v} = ${hex(v)} i hex`; };
    const { row } = clickableBits(4, true, update);
    update(0);
    box.append(row, label);
  } else if (kind === 'rgbOnOff') {
    const on = { r: false, g: false, b: false };
    const sw = swatch('#000000');
    const label = status();
    const render = () => {
      const c: Rgb = { r: on.r ? 255 : 0, g: on.g ? 255 : 0, b: on.b ? 255 : 0 };
      const code = rgbToHex(c);
      sw.style.background = code;
      const name = BASIC_COLORS.find((b) => rgbToHex(b.rgb) === code)!.name;
      const lit = (['r', 'g', 'b'] as const).filter((k) => on[k]).map((k) => ({ r: 'rød', g: 'grøn', b: 'blå' })[k]);
      label.textContent = lit.length === 0 ? 'Alle lys slukket: sort' : `${lit.join(' + ')} = ${name}`;
    };
    const buttons = (['r', 'g', 'b'] as const).map((k) => {
      const b = el('button', { className: `bi-btn hi-light hi-${k}`, type: 'button' }, { r: 'Rød', g: 'Grøn', b: 'Blå' }[k]);
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => {
        on[k] = !on[k];
        b.classList.toggle('on', on[k]);
        b.setAttribute('aria-pressed', String(on[k]));
        render();
      };
      return b;
    });
    render();
    box.append(el('div', { className: 'bi-actions' }, ...buttons), sw, label);
  } else {
    const sw = swatch('#000000');
    const label = status();
    const update = (c: Rgb) => {
      sw.style.background = rgbToHex(c);
      label.textContent = `Farvekode: ${rgbToHex(c)}`;
    };
    const s = sliders(1, update);
    update(s.value());
    box.append(s.box, sw, label);
  }
  return box;
}

function mount(container: HTMLElement, ctx: ChallengeContext): () => void {
  const lesson = makeLesson(ctx.level);
  const total = exerciseCount(lesson);
  const root = el('div', { className: 'bi hi' });
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
    if (info.swatches) card.append(el('div', { className: 'hi-samples' }, ...info.swatches.map(labelledSwatch)));
    if (info.demo) card.append(demo(info.demo));
    const next = nextButton();
    card.append(el('div', { className: 'bi-actions' }, next));
    root.replaceChildren(progress(), card);
    next.focus({ preventScroll: true });
  }

  /** Afslut en øvelse: giv point, vis forklaring og Næste-knap. */
  function conclude(feedback: HTMLElement, ok: boolean, headline: string, explain: string, extra: Node[] = []) {
    if (ok) {
      correct++;
      ctx.addPoints(POINTS_PER_CORRECT);
    }
    feedback.className = `bi-feedback ${ok ? 'ok' : 'bad'}`;
    feedback.replaceChildren(
      el('strong', {}, ok ? `Rigtigt! +${POINTS_PER_CORRECT} point` : headline),
      ...extra,
      el('div', {}, explain),
    );
    const next = nextButton();
    feedback.append(el('div', { className: 'bi-actions' }, next));
    next.focus({ preventScroll: true });
  }

  function showColor(task: Extract<Exercise, { kind: 'color' }>, body: HTMLElement, form: HTMLFormElement,
    feedback: HTMLElement, submit: HTMLButtonElement) {
    const guessBox = swatch(null);
    body.append(el('div', { className: 'hi-pair' },
      el('figure', {}, swatch(rgbToHex(task.target)), el('figcaption', {}, 'Mål')),
      el('figure', {}, guessBox, el('figcaption', {}, 'Dit gæt')),
    ));
    const tries = el('p', { className: 'bi-kicker' });
    let attempts = 0;
    const updateTries = () => { tries.textContent = `Forsøg ${attempts + 1} af ${task.attempts}`; };
    updateTries();
    const paint = (c: Rgb | null) => {
      guessBox.classList.toggle('hi-empty', !c);
      guessBox.style.background = c ? rgbToHex(c) : '';
    };

    let read: () => Rgb | null;
    let lock: () => void;
    let focus: HTMLElement | null = null;
    if (task.input === 'sliders') {
      const code = el('p', { className: 'bi-muted bi-mono' });
      const s = sliders(0x33, (c) => { paint(c); code.textContent = `Din kode: ${rgbToHex(c)}`; });
      paint(s.value());
      code.textContent = `Din kode: ${rgbToHex(s.value())}`;
      body.append(s.box, code);
      form.append(submit);
      read = s.value;
      lock = s.disable;
    } else {
      const input = el('input', {
        className: 'bi-input bi-mono', type: 'text', autocomplete: 'off', spellcheck: false, maxLength: 7, placeholder: '#RRGGBB',
      });
      input.setAttribute('aria-label', 'Farvekode');
      input.oninput = () => paint(parseHexColor(input.value));
      form.append(input, submit);
      read = () => parseHexColor(input.value);
      lock = () => { input.disabled = true; };
      focus = input;
    }
    body.append(tries);
    submit.textContent = 'Tjek farve';

    let done = false;
    form.onsubmit = (e) => {
      e.preventDefault();
      if (done) return;
      const guess = read();
      if (!guess) {
        feedback.className = 'bi-feedback warn';
        feedback.textContent = 'Skriv en farvekode med seks hex-cifre, fx #3366CC.';
        return;
      }
      attempts++;
      const ok = colorDistance(guess, task.target) <= task.tolerance;
      const hints = el('ul', { className: 'hi-hints' }, ...channelHints(guess, task.target).map((t) => el('li', {}, t)));
      if (ok || attempts >= task.attempts) {
        done = true;
        lock();
        submit.remove();
        tries.remove();
        conclude(feedback, ok, `Ikke helt. Målet var ${rgbToHex(task.target)}.`, task.explain, ok ? [] : [hints]);
      } else {
        feedback.className = 'bi-feedback warn';
        feedback.replaceChildren(el('strong', {}, `${rgbToHex(guess)} er ikke helt rigtig. Prøv igen:`), hints);
        updateTries();
        if (focus instanceof HTMLInputElement) focus.select();
      }
    };
    return focus;
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

    if (task.kind === 'color') {
      const focus = showColor(task, body, form, feedback, submit);
      root.replaceChildren(progress(), body, form, feedback);
      focus?.focus({ preventScroll: true });
      return;
    }

    let read: () => number | null;
    let invalidText = '';
    let focus: HTMLElement | null = null;
    let lock = () => {};

    if (task.big) {
      const big = el('div', { className: 'bi-big bi-mono' }, task.big);
      body.append(big);
    }
    if ((task.kind === 'number' || task.kind === 'choice') && task.swatch) body.append(swatch(task.swatch));

    if (task.kind === 'choice') {
      const group = el('div', { className: `bi-options${task.swatchOptions ? ' hi-swatch-options' : ''}`, role: 'radiogroup' } as Partial<HTMLDivElement>);
      let picked: number | null = null;
      const buttons = task.options.map((opt, i) => {
        const b = el('button', { className: 'bi-option', type: 'button' });
        if (task.swatchOptions) {
          b.append(swatch(opt, 'small'));
          b.setAttribute('aria-label', `Farve ${i + 1}`);
        } else b.textContent = opt;
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
          if (task.swatchOptions) b.append(el('span', { className: 'hi-code bi-mono' }, task.options[j]));
          if (j === task.answer) b.classList.add('right');
          else if (j === picked) b.classList.add('wrong');
        });
      };
    } else if (task.kind === 'bits') {
      const bits = clickableBits(task.size, true);
      body.append(bits.row);
      form.append(submit);
      read = bits.value;
      lock = bits.disable;
    } else {
      const isHex = task.kind === 'hex';
      const input = el('input', {
        className: `bi-input${isHex ? ' bi-mono' : ''}`, type: 'text', autocomplete: 'off', spellcheck: false,
        inputMode: isHex ? 'text' : 'numeric', placeholder: isHex ? '0-9 og A-F' : 'Skriv et tal',
      });
      input.setAttribute('aria-label', isHex ? 'Dit svar i hex' : 'Dit svar som tal');
      form.append(input, submit);
      read = () => parseAnswer(input.value, isHex ? 'hex' : 'dec');
      invalidText = isHex ? 'Brug kun cifrene 0-9 og bogstaverne A-F.' : 'Skriv et tal med cifrene 0-9.';
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
      const rightText = task.kind === 'choice' ? task.options[task.answer]
        : task.kind === 'bits' ? toBinary(task.answer, task.size)
        : task.kind === 'hex' ? hex(task.answer)
        : String(task.answer);
      let headline = `Ikke helt. Svaret er ${rightText}.`;
      if (task.kind === 'hex' && given !== task.answer && given < 256) headline += ` Du skrev ${hexExplain(given)}.`;
      conclude(feedback, given === task.answer, headline, task.explain);
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
  id: 'hex-intro',
  title: 'Introduktion til hex og farver',
  description: 'Lær hexadecimal fra bunden, og hvordan skærmen blander rødt, grønt og blåt lys til farvekoder som #FF8000. Tag den før Hex-jagt.',
  category: 'Talsystemer',
  levels: LESSON_TITLES.length,
  mount,
};
