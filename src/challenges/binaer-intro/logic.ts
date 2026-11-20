import { createUniqueRandom, type Rng, type UniqueRandom } from '../../core/unique';

/** Tilfældighed for én lektion. `u` sørger for, at samme opgave ikke kommer to gange. */
export interface Gen {
  rng: Rng;
  u: UniqueRandom;
}

const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

/** Heltal i [min, max], som ikke er brugt før i lektionen til denne slags opgave. */
function uniq(g: Gen, kind: string, min: number, max: number): number {
  return g.u.pick(() => randInt(g.rng, min, max), (v) => `${kind}-${v}`);
}

/** En række bits, der vises i en forklaring eller opgave. */
export interface BitView {
  value: number;
  size: number;
  /** Vis pladsværdierne (8 4 2 1) over bitsene. */
  showWeights: boolean;
  /** Fremhæv bitten med denne position, talt fra højre og fra 0. */
  highlight?: number;
}

export type Exercise =
  | { kind: 'choice'; prompt: string; bits?: BitView; options: string[]; answer: number; explain: string }
  | { kind: 'number'; prompt: string; bits?: BitView; answer: number; explain: string }
  | { kind: 'binary'; prompt: string; big?: string; bigBinary?: boolean; answer: number; explain: string }
  | {
      kind: 'bits'; prompt: string; big?: string; bigBinary?: boolean; size: number; answer: number;
      showWeights: boolean; showSum: boolean; explain: string;
    };

/** Små interaktive eksempler i forklaringerne. */
export type Demo = 'bits1' | 'bits4' | 'counter';

export interface Info {
  /** Overskrift og tekst. Teksten er fast HTML skrevet her i filen. */
  title: string;
  html: string;
  example?: BitView;
  demo?: Demo;
}

export type Step = { type: 'info'; info: Info } | { type: 'exercise'; exercise: Exercise };

export interface Lesson {
  title: string;
  steps: Step[];
}

export const POINTS_PER_CORRECT = 10;

// ---------- Hjælpere ----------

export function toBinary(value: number, size: number): string {
  return value.toString(2).padStart(size, '0');
}

/** Fortolker et binært svar (mellemrum tilladt). Returnerer null ved ugyldigt input. */
export function parseBinary(input: string): number | null {
  const s = input.replace(/[\s_]/g, '');
  if (!/^[01]+$/.test(s)) return null;
  return parseInt(s, 2);
}

/** Fortolker et decimalt svar. Returnerer null ved ugyldigt input. */
export function parseDecimal(input: string): number | null {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

export function bitsToValue(bits: boolean[]): number {
  return bits.reduce((acc, on) => acc * 2 + (on ? 1 : 0), 0);
}

/** Pladsværdierne for de tændte bits, største først: 11 → [8, 2, 1]. */
export function placeValues(value: number): number[] {
  const parts: number[] = [];
  for (let p = 1; p <= value; p *= 2) if (value & p) parts.unshift(p);
  return parts;
}

/** "1011 = 8 + 2 + 1 = 11" */
export function sumExplain(value: number, size: number): string {
  const parts = placeValues(value);
  const bin = toBinary(value, size);
  if (parts.length === 0) return `${bin} = 0`;
  if (parts.length === 1) return `${bin} = ${value}`;
  return `${bin} = ${parts.join(' + ')} = ${value}`;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Svarmuligheder i tilfældig rækkefølge. Første element i `values` er det rigtige. */
function choice(prompt: string, values: (string | number)[], explain: string, rng: Rng, bits?: BitView): Exercise {
  const unique = [...new Set(values.map(String))].slice(0, 4);
  const options = shuffle(unique, rng);
  return { kind: 'choice', prompt, bits, options, answer: options.indexOf(unique[0]), explain };
}

const info = (title: string, html: string, extra: Partial<Info> = {}): Step => ({ type: 'info', info: { title, html, ...extra } });
const ex = (exercise: Exercise): Step => ({ type: 'exercise', exercise });

// ---------- Opgavetyper ----------

/** Tænd bitsene, så de viser et bestemt mønster. */
export function copyPattern(g: Gen, size: number): Exercise {
  const value = uniq(g, 'copy', 1, 2 ** size - 1);
  const pattern = toBinary(value, size);
  return {
    kind: 'bits', prompt: 'Tænd og sluk bitsene, så de viser dette mønster:', big: pattern, bigBinary: true,
    size, answer: value, showWeights: false, showSum: false,
    explain: `Mønsteret er ${pattern}: 1 betyder tændt, 0 betyder slukket.`,
  };
}

export function countOnes(g: Gen, size: number): Exercise {
  const value = uniq(g, 'ones', 1, 2 ** size - 1);
  const ones = placeValues(value).length;
  return {
    kind: 'number', prompt: `Hvor mange bits er tændt (er 1) her?`,
    bits: { value, size, showWeights: false }, answer: ones,
    explain: `${toBinary(value, size)} har ${ones} ${ones === 1 ? 'bit' : 'bits'}, der er 1.`,
  };
}

export function patternCount(g: Gen): Exercise {
  const n = uniq(g, 'patterns', 2, 4); // 2-4 bits
  const right = 2 ** n;
  return choice(
    `Hvor mange forskellige mønstre kan ${n} bits lave?`,
    [right, n, n * 2, right + 1, n * n === right ? right - 1 : n * n],
    `Hver bit fordobler antallet: ${Array(n).fill(2).join(' · ')} = ${right}.`,
    g.rng,
  );
}

export function nextPlaceValue(g: Gen): Exercise {
  const k = uniq(g, 'next', 2, 7);
  const seq = Array.from({ length: k + 1 }, (_, i) => 2 ** i);
  const answer = 2 ** (k + 1);
  return {
    kind: 'number', prompt: `Hvad er den næste pladsværdi? ${seq.join(', ')}, …`, answer,
    explain: `Hver plads er dobbelt så meget værd som den før: ${seq[k]} · 2 = ${answer}.`,
  };
}

export function markedBit(g: Gen, size: number): Exercise {
  const pos = uniq(g, 'mark', 1, size - 1);
  const value = 2 ** pos;
  return {
    kind: 'number', prompt: 'Hvor meget er den markerede bit værd?',
    bits: { value: 0, size, showWeights: false, highlight: pos }, answer: value,
    explain: `Fra højre er pladsværdierne ${Array.from({ length: pos + 1 }, (_, i) => 2 ** i).join(', ')}. Den markerede bit er ${value} værd.`,
  };
}

export function lightPower(g: Gen, size: number): Exercise {
  const pos = uniq(g, 'light', 0, size - 1);
  const value = 2 ** pos;
  return {
    kind: 'bits', prompt: `Tænd kun den bit, der er ${value} værd.`, size, answer: value,
    showWeights: true, showSum: false, explain: `${toBinary(value, size)}: kun bitten med pladsværdien ${value} er tændt.`,
  };
}

export function binToDec(g: Gen, size: number, showWeights: boolean): Exercise {
  const min = size <= 3 ? 1 : 2 ** (size - 2) + 1; // fx 5-15 for 4 bit, så de fleste bits er i spil
  const value = uniq(g, 'b2d', min, 2 ** size - 1);
  return {
    kind: 'number', prompt: 'Hvilket decimaltal er dette binære tal?',
    bits: { value, size, showWeights }, answer: value, explain: sumExplain(value, size),
  };
}

export function decToBinClick(g: Gen, size: number, showSum: boolean): Exercise {
  const value = uniq(g, 'd2b', 3, 2 ** size - 1);
  return {
    kind: 'bits', prompt: 'Tænd de bits, der tilsammen giver tallet:', big: String(value), size, answer: value,
    showWeights: true, showSum, explain: sumExplain(value, size),
  };
}

export function decToBinTyped(g: Gen, size: number): Exercise {
  const value = uniq(g, 'd2b', 3, 2 ** size - 1);
  return {
    kind: 'binary', prompt: 'Skriv tallet som binært tal med 0 og 1:', big: String(value), answer: value,
    explain: sumExplain(value, size),
  };
}

export function countAfter(g: Gen, size: number, before = false): Exercise {
  const value = before
    ? uniq(g, 'cnt', 2, 2 ** size - 1)
    : uniq(g, 'cnt', 1, 2 ** size - 2);
  const answer = before ? value - 1 : value + 1;
  const shown = toBinary(value, size);
  const right = toBinary(answer, size);
  return {
    kind: 'binary', prompt: before ? 'Hvilket binært tal kommer lige før?' : 'Hvilket binært tal kommer lige efter?',
    big: shown, bigBinary: true, answer,
    explain: `${shown} er ${value}. ${before ? 'Før' : 'Efter'} kommer ${answer}, som er ${right}.`,
  };
}

export function largestNumber(g: Gen): Exercise {
  const n = uniq(g, 'largest', 3, 8); // 3-8 bits
  const right = 2 ** n - 1;
  return choice(
    `Hvad er det største tal, du kan skrive med ${n} bits?`,
    [right, 2 ** n, n * 2, 2 ** (n - 1)],
    `Alle ${n} bits tændt: ${'1'.repeat(n)} = ${right}. Det er én mindre end ${2 ** n}.`,
    g.rng,
  );
}

export function howManyNumbers(g: Gen): Exercise {
  const n = uniq(g, 'howmany', 3, 8);
  const right = 2 ** n;
  return choice(
    `Hvor mange forskellige tal (med 0 talt med) kan du skrive med ${n} bits?`,
    [right, right - 1, n * 2, 2 ** (n + 1)],
    `Tallene går fra 0 til ${right - 1}. Det er ${right} forskellige tal.`,
    g.rng,
  );
}

// ---------- Lektionerne ----------

export const LESSON_TITLES = [
  'Hvad er en bit?',
  'Pladsværdier',
  'Fra binær til decimal',
  'Fra decimal til binær',
  'Tæl i binær',
];

export function makeLesson(level: number, rng: Rng = Math.random): Lesson {
  const g: Gen = { rng, u: createUniqueRandom(rng) };
  const index = Math.min(Math.max(level, 1), LESSON_TITLES.length) - 1;
  const title = LESSON_TITLES[index];
  switch (index) {
    case 0:
      return {
        title,
        steps: [
          info('Tændt eller slukket',
            '<p>En computer er bygget af millioner af bittesmå kontakter. Hver kontakt kan kun være <strong>slukket</strong> eller <strong>tændt</strong>.</p>' +
            '<p>Slukket skriver vi som <code>0</code>, og tændt skriver vi som <code>1</code>. Sådan ét 0 eller 1 kaldes en <strong>bit</strong>.</p>' +
            '<p>Prøv selv: klik på bitten for at tænde og slukke den.</p>',
            { demo: 'bits1' }),
          ex(choice('Hvor mange forskellige værdier kan én bit have?', [2, 1, 10, 3],
            'En bit er enten 0 eller 1. Det er 2 muligheder.', rng)),
          info('Flere bits ved siden af hinanden',
            '<p>Én bit kan ikke sige ret meget. Men sætter vi flere bits ved siden af hinanden, kan de lave <strong>mønstre</strong>.</p>' +
            '<p>Med 2 bits kan vi lave 4 mønstre: <code>00</code>, <code>01</code>, <code>10</code> og <code>11</code>. ' +
            'Hver ekstra bit fordobler antallet af mønstre.</p>'),
          ex(copyPattern(g, 3)),
          ex(copyPattern(g, 4)),
          ex(countOnes(g, 5)),
          ex(patternCount(g)),
        ],
      };
    case 1:
      return {
        title,
        steps: [
          info('Pladser i titalssystemet',
            '<p>I de tal, du kender, har hver plads en værdi: <strong>enere</strong>, <strong>tiere</strong>, <strong>hundreder</strong> og så videre.</p>' +
            '<p><code>352</code> betyder 3 hundreder + 5 tiere + 2 enere. Hver plads er <strong>10 gange</strong> mere værd end pladsen til højre for den.</p>'),
          info('Pladser i totalssystemet',
            '<p>Binære tal virker på samme måde, men hver plads er kun <strong>2 gange</strong> mere værd end pladsen til højre.</p>' +
            '<p>Fra højre er pladsværdierne derfor <code>1, 2, 4, 8, 16, 32, …</code></p>' +
            '<p>Prøv at tænde bitsene og se, hvad de er værd.</p>',
            { demo: 'bits4' }),
          ex(nextPlaceValue(g)),
          ex(markedBit(g, 4)),
          ex(markedBit(g, 6)),
          ex(lightPower(g, 4)),
          ex(lightPower(g, 5)),
        ],
      };
    case 2:
      return {
        title,
        steps: [
          info('Læg pladsværdierne sammen',
            '<p>For at læse et binært tal lægger du pladsværdierne sammen for de bits, der er <code>1</code>. Bits, der er <code>0</code>, tæller ikke med.</p>' +
            '<p>Her er <code>1011</code>: bitsene med værdien 8, 2 og 1 er tændt. 8 + 2 + 1 = <strong>11</strong>.</p>',
            { example: { value: 11, size: 4, showWeights: true } }),
          ex(binToDec(g, 3, true)),
          ex(binToDec(g, 3, true)),
          ex(binToDec(g, 4, true)),
          info('Uden hjælp',
            '<p>Nu er pladsværdierne ikke skrevet over bitsene. Husk dem selv fra højre: <code>1, 2, 4, 8</code>.</p>'),
          ex(binToDec(g, 4, false)),
          ex(binToDec(g, 4, false)),
        ],
      };
    case 3:
      return {
        title,
        steps: [
          info('Start med den største',
            '<p>Vil du skrive et tal binært, så start ved den <strong>største pladsværdi, der kan være i tallet</strong>, og træk den fra.</p>' +
            '<p>Eksempel med <strong>13</strong>: 8 kan være i 13 (rest 5). 4 kan være i 5 (rest 1). 2 kan ikke være i 1. 1 kan være i 1 (rest 0).</p>' +
            '<p>Altså er 13 = 8 + 4 + 1 = <code>1101</code>.</p>',
            { example: { value: 13, size: 4, showWeights: true } }),
          ex(decToBinClick(g, 4, true)),
          ex(decToBinClick(g, 4, true)),
          ex(decToBinClick(g, 4, false)),
          info('Skriv det selv',
            '<p>Nu skal du skrive svaret med tastaturet. Brug samme metode og skriv en <code>1</code> for hver pladsværdi, du bruger, og en <code>0</code> for resten.</p>'),
          ex(decToBinTyped(g, 4)),
          ex(decToBinTyped(g, 4)),
        ],
      };
    default:
      return {
        title,
        steps: [
          info('Når en plads er fuld',
            '<p>I titalssystemet tæller du 8, 9, og så er enerpladsen fuld. Den bliver til 0, og du lægger 1 til pladsen til venstre: <code>10</code>.</p>' +
            '<p>Binært sker det bare hurtigere, fordi hver plads kun kan være 0 eller 1: <code>0, 1, 10, 11, 100, 101, 110, 111, 1000</code></p>' +
            '<p>Klik på <strong>+1</strong> og se tallet vokse.</p>',
            { demo: 'counter' }),
          ex(countAfter(g, 4)),
          ex(countAfter(g, 4)),
          ex(countAfter(g, 4, true)),
          info('Hvor langt kan man nå?',
            '<p>Det største tal med 4 bits er <code>1111</code> = 8 + 4 + 2 + 1 = <strong>15</strong>. Tæller du 0 med, kan 4 bits altså skrive <strong>16</strong> forskellige tal.</p>' +
            '<p>Generelt: med <em>n</em> bits kan du skrive 2 · 2 · … · 2 (n gange) forskellige tal, og det største er én mindre end det.</p>'),
          ex(largestNumber(g)),
          ex(howManyNumbers(g)),
        ],
      };
  }
}

export function exerciseCount(lesson: Lesson): number {
  return lesson.steps.filter((s) => s.type === 'exercise').length;
}
