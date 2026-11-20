import { createUniqueRandom, type Rng, type UniqueRandom } from '../../core/unique';
import { rgbToHex, type Rgb } from '../hex-jagt/logic';

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

/** Et element fra listen, som ikke er brugt før i lektionen til denne slags opgave. */
function uniqItem<T>(g: Gen, kind: string, items: T[]): T {
  return items[uniq(g, kind, 0, items.length - 1)];
}

export type Exercise =
  | {
      kind: 'choice'; prompt: string; big?: string; swatch?: string; options: string[];
      /** Svarmulighederne er farvekoder, der vises som farvefelter. */
      swatchOptions?: boolean; answer: number; explain: string;
    }
  | { kind: 'number'; prompt: string; big?: string; swatch?: string; answer: number; explain: string }
  | { kind: 'hex'; prompt: string; big?: string; answer: number; explain: string }
  | { kind: 'bits'; prompt: string; big: string; size: number; answer: number; explain: string }
  | {
      kind: 'color'; prompt: string; target: Rgb;
      /** sliders: tre skydere i trin på 33. text: skriv selv koden. */
      input: 'sliders' | 'text';
      /** Største tilladte afvigelse pr. kanal for at svaret tæller som rigtigt. */
      tolerance: number; attempts: number; explain: string;
    };

/** Små interaktive eksempler i forklaringerne. */
export type Demo = 'hexCounter' | 'hex2' | 'nibble' | 'rgbOnOff' | 'rgbSliders';

export interface SwatchLabel {
  code: string;
  label: string;
}

export interface Info {
  /** Overskrift og tekst. Teksten er fast HTML skrevet her i filen. */
  title: string;
  html: string;
  demo?: Demo;
  /** En række farvefelter med navne, som eksempler. */
  swatches?: SwatchLabel[];
}

export type Step = { type: 'info'; info: Info } | { type: 'exercise'; exercise: Exercise };

export interface Lesson {
  title: string;
  steps: Step[];
}

export const POINTS_PER_CORRECT = 10;

// ---------- Hjælpere ----------

export const hex = (n: number, width = 1) => n.toString(16).toUpperCase().padStart(width, '0');

/** "2F = 2 · 16 + 15 = 47" */
export function hexExplain(value: number): string {
  const hi = value >> 4;
  const lo = value & 15;
  if (value < 16) return `${hex(value)} = ${value}`;
  return `${hex(value)} = ${hi} · 16 + ${lo} = ${hi * 16 + lo}`;
}

export function toBinary(value: number, size: number): string {
  return value.toString(2).padStart(size, '0');
}

/** "1010 0111" */
export function groupedBinary(value: number, size: number): string {
  return toBinary(value, size).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Op til 4 svarmuligheder i tilfældig rækkefølge. Første element i `values` er det rigtige. */
function choice(
  prompt: string, values: (string | number)[], explain: string, rng: Rng,
  extra: { swatch?: string; swatchOptions?: boolean } = {},
): Exercise {
  const unique = [...new Set(values.map(String))].slice(0, 4);
  const options = shuffle(unique, rng);
  return { kind: 'choice', prompt, options, answer: options.indexOf(unique[0]), explain, ...extra };
}

const info = (title: string, html: string, extra: Partial<Info> = {}): Step => ({ type: 'info', info: { title, html, ...extra } });
const ex = (exercise: Exercise): Step => ({ type: 'exercise', exercise });

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

// ---------- Farver ----------

/** De otte grundfarver, man får med lysene helt slukket eller helt tændt. */
export const BASIC_COLORS: { rgb: Rgb; name: string; lights: string }[] = [
  { rgb: rgb(255, 0, 0), name: 'rød', lights: 'Kun rød' },
  { rgb: rgb(0, 255, 0), name: 'grøn', lights: 'Kun grøn' },
  { rgb: rgb(0, 0, 255), name: 'blå', lights: 'Kun blå' },
  { rgb: rgb(255, 255, 0), name: 'gul', lights: 'Rød og grøn' },
  { rgb: rgb(255, 0, 255), name: 'magenta', lights: 'Rød og blå' },
  { rgb: rgb(0, 255, 255), name: 'cyan', lights: 'Grøn og blå' },
  { rgb: rgb(255, 255, 255), name: 'hvid', lights: 'Alle tre' },
  { rgb: rgb(0, 0, 0), name: 'sort', lights: 'Ingen' },
];

/** Blandede farver med et navn, som bruges i eksempler og opgaver. */
export const MIXED_COLORS: { code: string; name: string }[] = [
  { code: '#FF8000', name: 'orange' },
  { code: '#FF99CC', name: 'lyserød' },
  { code: '#996633', name: 'brun' },
  { code: '#9933CC', name: 'lilla' },
  { code: '#808080', name: 'grå' },
  { code: '#006600', name: 'mørkegrøn' },
  { code: '#99CCFF', name: 'lyseblå' },
  { code: '#000080', name: 'mørkeblå' },
  { code: '#FFFF99', name: 'lysegul' },
  { code: '#800000', name: 'mørkerød' },
];

const CHANNELS: [keyof Rgb, string][] = [['r', 'Rød'], ['g', 'Grøn'], ['b', 'Blå']];

/** Kort beskrivelse af en kanals styrke: 00 slukket, FF fuld styrke. */
function strength(v: number): string {
  if (v === 0) return 'slukket';
  if (v === 255) return 'fuld styrke';
  if (v >= 0xb0) return 'stærk';
  if (v >= 0x50) return 'halv styrke';
  return 'svag';
}

export function describeCode(c: Rgb): string {
  return CHANNELS.map(([k, n]) => `${n} ${hex(c[k], 2)} (${strength(c[k])})`).join(', ');
}

// ---------- Opgavetyper: hex-cifre ----------

export function letterToDec(g: Gen): Exercise {
  const v = uniq(g, 'digit', 10, 15);
  return {
    kind: 'number', prompt: 'Hvilket decimaltal står hex-cifferet for?', big: hex(v), answer: v,
    explain: `A = 10, B = 11, C = 12, D = 13, E = 14, F = 15. Altså er ${hex(v)} = ${v}.`,
  };
}

export function decToLetter(g: Gen): Exercise {
  const v = uniq(g, 'digit', 10, 15);
  return {
    kind: 'hex', prompt: 'Skriv tallet som ét hex-ciffer:', big: String(v), answer: v,
    explain: `${v} skrives som ${hex(v)} i hex.`,
  };
}

export function digitCount(g: Gen): Exercise {
  return choice('Hvor mange forskellige cifre bruger hexadecimal?', [16, 10, 15, 6],
    '0-9 er 10 cifre, og A-F er 6 mere. 10 + 6 = 16. Derfor hedder det hexadecimal (hexa = 6, decimal = 10).', g.rng);
}

/** Det næste hex-tal. Vælger tal, hvor noget spændende sker: 9 → A eller F → 10. */
export function hexNext(g: Gen): Exercise {
  const v = uniqItem(g, 'next', [0x9, 0xf, 0x19, 0x1f, 0x29, 0x2f, 0x3f, 0x99, 0x4f, 0xaf]);
  const answer = v + 1;
  return {
    kind: 'hex', prompt: 'Hvilket hex-tal kommer lige efter?', big: hex(v), answer,
    explain: (v & 15) === 15
      ? `Efter F er pladsen fuld. Den bliver til 0, og 1 lægges til pladsen til venstre: ${hex(v)} + 1 = ${hex(answer)}.`
      : `Efter 9 kommer A i hex: ${hex(v)} + 1 = ${hex(answer)}.`,
  };
}

// ---------- Opgavetyper: to hex-cifre ----------

export function hexToDec(g: Gen, min: number, max: number): Exercise {
  const v = g.u.pick(() => randInt(g.rng, min, max), (n) => `h2d-${n}`);
  return {
    kind: 'number', prompt: 'Hvilket decimaltal er dette hex-tal?', big: hex(v, 2), answer: v,
    explain: hexExplain(v),
  };
}

export function decToHex(g: Gen, min: number, max: number): Exercise {
  const v = g.u.pick(() => randInt(g.rng, min, max), (n) => `d2h-${n}`);
  const hi = v >> 4;
  return {
    kind: 'hex', prompt: 'Skriv tallet som hex-tal:', big: String(v), answer: v,
    explain: `16 kan være ${hi} gange i ${v} (${hi} · 16 = ${hi * 16}), og der er ${v & 15} tilbage. ` +
      `Altså ${hex(hi)} og ${hex(v & 15)}: ${v} = ${hex(v, 2)}.`,
  };
}

export function largestTwoDigits(g: Gen): Exercise {
  return choice('Hvad er FF i decimal?', [255, 256, 1515, 99],
    'FF = 15 · 16 + 15 = 240 + 15 = 255. Det er det største tal med to hex-cifre.', g.rng);
}

// ---------- Opgavetyper: hex og binær ----------

export function hexDigitToBits(g: Gen): Exercise {
  const v = uniq(g, 'nibble', 3, 15);
  return {
    kind: 'bits', prompt: 'Tænd de 4 bits, der svarer til hex-cifferet:', big: hex(v), size: 4, answer: v,
    explain: `${hex(v)} = ${v} = ${toBinary(v, 4)}.`,
  };
}

export function bitsToHexDigit(g: Gen): Exercise {
  const v = uniq(g, 'nibble', 3, 15);
  return {
    kind: 'hex', prompt: 'Skriv de 4 bits som ét hex-ciffer:', big: toBinary(v, 4), answer: v,
    explain: `${toBinary(v, 4)} = ${v}, og ${v} skrives ${hex(v)} i hex.`,
  };
}

export function byteToHex(g: Gen): Exercise {
  const v = g.u.pick(() => randInt(g.rng, 0x21, 0xfe), (n) => `byte-${n}`);
  const hi = v >> 4;
  const lo = v & 15;
  return {
    kind: 'hex', prompt: 'Skriv byten (8 bits) som to hex-cifre:', big: groupedBinary(v, 8), answer: v,
    explain: `Del i to grupper af 4: ${toBinary(hi, 4)} = ${hex(hi)} og ${toBinary(lo, 4)} = ${hex(lo)}. Altså ${hex(v, 2)}.`,
  };
}

export function hexToByte(g: Gen): Exercise {
  const v = g.u.pick(() => randInt(g.rng, 0x21, 0xfe), (n) => `byte-${n}`);
  return {
    kind: 'bits', prompt: 'Tænd de 8 bits, der svarer til hex-tallet:', big: hex(v, 2), size: 8, answer: v,
    explain: `${hex(v >> 4)} = ${toBinary(v >> 4, 4)} og ${hex(v & 15)} = ${toBinary(v & 15, 4)}. Altså ${groupedBinary(v, 8)}.`,
  };
}

// ---------- Opgavetyper: lys og farver ----------

export function mixLights(g: Gen): Exercise {
  // Kun blandinger af to eller flere lys (eller ingen), dem man ikke kan gætte.
  const c = uniqItem(g, 'mix', BASIC_COLORS.slice(3));
  const names = ['gul', 'magenta', 'cyan', 'hvid', 'sort', 'brun', 'lilla'];
  const others = shuffle(names.filter((n) => n !== c.name), g.rng).slice(0, 3);
  const lights = c.lights === 'Ingen' ? 'Når alle tre lys er slukket' : c.lights === 'Alle tre' ? 'Når alle tre lys lyser fuldt'
    : `Når ${c.lights.toLowerCase()} lyser fuldt`;
  return choice(
    c.lights === 'Ingen' || c.lights === 'Alle tre'
      ? `${lights}, hvilken farve ser du?`
      : `${c.lights} lyser fuldt, og det sidste lys er slukket. Hvilken farve ser du?`,
    [c.name, ...others],
    `${lights}, bliver det ${c.name} (${rgbToHex(c.rgb)}).`,
    g.rng,
  );
}

export function whichLights(g: Gen): Exercise {
  const c = uniqItem(g, 'mix', BASIC_COLORS.slice(3, 6));
  const all = ['Rød og grøn', 'Rød og blå', 'Grøn og blå', 'Alle tre'];
  return choice(`Hvilke lys skal lyse fuldt for at lave ${c.name}?`, [c.lights, ...all],
    `${c.name[0].toUpperCase()}${c.name.slice(1)} er ${c.lights.toLowerCase()}: ${rgbToHex(c.rgb)}.`,
    g.rng, { swatch: rgbToHex(c.rgb) });
}

export function fullStrength(g: Gen): Exercise {
  return choice('Hvilket tal betyder, at et lys lyser med fuld styrke?', [255, 100, 16, 1],
    'Hvert lys går fra 0 (slukket) til 255 (fuld styrke). 255 er det største tal, en byte kan rumme.', g.rng);
}

export function rgbName(g: Gen): Exercise {
  const c = uniqItem(g, 'rgbname', BASIC_COLORS.slice(0, 6));
  const names = BASIC_COLORS.map((b) => b.name).filter((n) => n !== c.name);
  return choice(
    `Hvilken farve får du med rød = ${c.rgb.r}, grøn = ${c.rgb.g}, blå = ${c.rgb.b}?`,
    [c.name, ...shuffle(names, g.rng)],
    `${c.lights} lyser fuldt, så farven er ${c.name}.`, g.rng,
  );
}

// ---------- Opgavetyper: farvekoder ----------

export function whichPair(g: Gen): Exercise {
  const [k, name] = uniqItem(g, 'pair', CHANNELS);
  const byte = () => randInt(g.rng, 1, 15) * 16 + randInt(g.rng, 0, 15);
  let c: Rgb;
  do c = rgb(byte(), byte(), byte());
  while (new Set([c.r, c.g, c.b]).size < 3);
  const code = rgbToHex(c);
  const pairs = [c.r, c.g, c.b].map((v) => hex(v, 2));
  return {
    kind: 'choice', prompt: `Hvilket par cifre i ${code} styrer ${name.toLowerCase()}?`, swatch: code,
    options: pairs, answer: CHANNELS.findIndex(([ck]) => ck === k),
    explain: `Rækkefølgen er altid #RRGGBB: rød ${pairs[0]}, grøn ${pairs[1]}, blå ${pairs[2]}.`,
  };
}

export function pairToDec(g: Gen): Exercise {
  const [k, name] = uniqItem(g, 'p2d', CHANNELS);
  const v = uniq(g, 'p2dv', 0x21, 0xee);
  const c = rgb(0, 0, 0);
  c[k] = v;
  const code = rgbToHex(c);
  return {
    kind: 'number', prompt: `Hvor stærkt lyser ${name.toLowerCase()} i ${code}? Svar med et tal fra 0 til 255.`,
    swatch: code, answer: v, explain: `${name} er parret ${hex(v, 2)}, og ${hexExplain(v)}.`,
  };
}

export function codeToSwatch(g: Gen): Exercise {
  const c = uniqItem(g, 'basic', BASIC_COLORS);
  const others = shuffle(BASIC_COLORS.filter((b) => b !== c), g.rng).slice(0, 3);
  const code = rgbToHex(c.rgb);
  return choice(`Hvilken farve har koden ${code}?`, [code, ...others.map((o) => rgbToHex(o.rgb))],
    `${code}: ${describeCode(c.rgb)}. Det giver ${c.name}.`, g.rng, { swatchOptions: true });
}

export function swatchToCode(g: Gen): Exercise {
  const c = uniqItem(g, 'basic', BASIC_COLORS);
  const others = shuffle(BASIC_COLORS.filter((b) => b !== c), g.rng).slice(0, 3);
  const code = rgbToHex(c.rgb);
  return choice('Hvilken kode passer til farven?', [code, ...others.map((o) => rgbToHex(o.rgb))],
    `Farven er ${c.name}: ${describeCode(c.rgb)}, altså ${code}.`, g.rng, { swatch: code });
}

export function typeBasic(g: Gen): Exercise {
  const c = uniqItem(g, 'basic', BASIC_COLORS.slice(0, 6));
  return {
    kind: 'color', prompt: `Skriv farvekoden for ${c.name}.`, target: c.rgb, input: 'text', tolerance: 0, attempts: 2,
    explain: `${c.lights} skal lyse fuldt (FF), resten skal være slukket (00): ${rgbToHex(c.rgb)}.`,
  };
}

// ---------- Opgavetyper: lyse, mørke og blandede farver ----------

const STEPS = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];

export function findGray(g: Gen): Exercise {
  const v = uniqItem(g, 'gray', [0x33, 0x55, 0x77, 0x99, 0xaa, 0xcc]);
  const p = hex(v, 2);
  const q = hex(v >= 0x99 ? v - 0x44 : v + 0x44, 2);
  return choice('Hvilken af koderne er en grå farve?', [`#${p}${p}${p}`, `#${p}${q}${p}`, `#${p}${p}${q}`, `#${q}${p}${p}`],
    `Når rød, grøn og blå er lige stærke, bliver farven grå: #${p}${p}${p}. Lav værdi giver mørkegrå, høj giver lysegrå.`,
    g.rng);
}

export function darkest(g: Gen): Exercise {
  // En farvetone (fx rød+blå) i fire styrker.
  const tone = uniqItem(g, 'tone', [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1]]);
  const codes = [0x33, 0x66, 0x99, 0xcc].map((v) => rgbToHex(rgb(tone[0] * v, tone[1] * v, tone[2] * v)));
  return choice('Hvilken af koderne giver den mørkeste farve?', codes,
    `Jo lavere tallene er, jo mindre lys, og jo mørkere farve. ${codes[0]} har de laveste tal.`, g.rng);
}

export function strongest(g: Gen): Exercise {
  const [k, name] = uniqItem(g, 'strong', CHANNELS);
  const c = rgb(0, 0, 0);
  const lows = shuffle([0x00, 0x33, 0x66, 0x99], g.rng);
  CHANNELS.forEach(([ck], i) => { c[ck] = ck === k ? STEPS[randInt(g.rng, 4, 5)] : lows[i]; });
  const code = rgbToHex(c);
  return {
    kind: 'choice', prompt: `Hvilket lys er stærkest i ${code}?`, options: CHANNELS.map(([, n]) => n),
    answer: CHANNELS.findIndex(([ck]) => ck === k),
    explain: `${describeCode(c)}. ${name} har det højeste par.`,
  };
}

export function mixedToSwatch(g: Gen): Exercise {
  const c = uniqItem(g, 'mixed', MIXED_COLORS);
  const others = shuffle(MIXED_COLORS.filter((m) => m !== c), g.rng).slice(0, 3);
  return choice(`Hvilken farve har koden ${c.code}?`, [c.code, ...others.map((o) => o.code)],
    `${c.code} er ${c.name}. ${describeCode(hexToRgb(c.code))}.`, g.rng, { swatchOptions: true });
}

export function lighter(g: Gen): Exercise {
  const base = g.u.pick(
    () => rgb(STEPS[randInt(g.rng, 1, 3)], STEPS[randInt(g.rng, 1, 3)], STEPS[randInt(g.rng, 1, 3)]),
    (c) => `light-${rgbToHex(c)}`,
  );
  const up = (v: number) => v + 0x33;
  const down = (v: number) => v - 0x33;
  const code = rgbToHex(base);
  const right = rgbToHex(rgb(up(base.r), up(base.g), up(base.b)));
  const darker = rgbToHex(rgb(down(base.r), down(base.g), down(base.b)));
  const onlyRed = rgbToHex(rgb(up(base.r), base.g, base.b));
  const onlyBlue = rgbToHex(rgb(base.r, base.g, up(base.b)));
  return choice(`Du vil gøre ${code} lysere uden at ændre farvetonen. Hvilken kode skal du bruge?`,
    [right, darker, onlyRed, onlyBlue],
    `Skru lige meget op for alle tre lys: ${right}. Skruer du kun op for ét lys, ændrer du farvetonen.`,
    g.rng, { swatch: code });
}

// ---------- Opgavetyper: ram farven ----------

export function matchColor(g: Gen, input: 'sliders' | 'text', tolerance: number): Exercise {
  const target = g.u.pick(() => {
    // Mindst to forskellige styrker, så det ikke bare er sort, hvid eller grå.
    let c: Rgb;
    do c = rgb(STEPS[randInt(g.rng, 0, 5)], STEPS[randInt(g.rng, 0, 5)], STEPS[randInt(g.rng, 0, 5)]);
    while (c.r === c.g && c.g === c.b);
    return c;
  }, (c) => `match-${rgbToHex(c)}`);
  return {
    kind: 'color', target, input, tolerance, attempts: 3,
    prompt: input === 'sliders' ? 'Brug skyderne til at lave den samme farve som målet.' : 'Skriv en farvekode, der rammer målfarven.',
    explain: `Målet var ${rgbToHex(target)}: ${describeCode(target)}.`,
  };
}

export function hexToRgb(code: string): Rgb {
  const s = code.replace('#', '');
  return rgb(parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16));
}

// ---------- Lektionerne ----------

export const LESSON_TITLES = [
  'Seksten cifre',
  'To hex-cifre',
  'Hex og binær',
  'Lys og farver på skærmen',
  'Farvekoder: #RRGGBB',
  'Lyse, mørke og blandede farver',
  'Ram farven',
];

const SW = (code: string, label: string): SwatchLabel => ({ code, label });

export function makeLesson(level: number, rng: Rng = Math.random): Lesson {
  const g: Gen = { rng, u: createUniqueRandom(rng) };
  const index = Math.min(Math.max(level, 1), LESSON_TITLES.length) - 1;
  const title = LESSON_TITLES[index];
  switch (index) {
    case 0:
      return {
        title,
        steps: [
          info('Et kortere talsystem',
            '<p>Binære tal bliver hurtigt lange. Tallet 255 er <code>11111111</code> binært. Det er svært at læse og nemt at skrive forkert.</p>' +
            '<p>Derfor bruger programmører ofte <strong>hexadecimal</strong> (kort: <strong>hex</strong>). Det er et talsystem med <strong>16 cifre</strong> i stedet for 10. Her er 255 bare <code>FF</code>.</p>'),
          info('Bogstaver som cifre',
            '<p>Vi har kun ti cifre, 0 til 9. De sidste seks cifre i hex skrives derfor med bogstaver:</p>' +
            '<p><code>A = 10</code> &nbsp; <code>B = 11</code> &nbsp; <code>C = 12</code> &nbsp; <code>D = 13</code> &nbsp; <code>E = 14</code> &nbsp; <code>F = 15</code></p>' +
            '<p>Klik på <strong>+1</strong> og se hex-cifferet ved siden af det almindelige tal.</p>',
            { demo: 'hexCounter' }),
          ex(digitCount(g)),
          ex(letterToDec(g)),
          ex(letterToDec(g)),
          ex(decToLetter(g)),
          info('Efter F',
            '<p>Når du tæller i hex, kommer der seks cifre mere efter 9: <code>8, 9, A, B, C, D, E, F</code>.</p>' +
            '<p>Efter <code>F</code> er pladsen fuld. Den bliver til 0, og du lægger 1 til pladsen til venstre: <code>F + 1 = 10</code>. ' +
            'Men pas på: <code>10</code> i hex betyder <strong>16</strong>, ikke ti!</p>'),
          ex(hexNext(g)),
          ex(hexNext(g)),
        ],
      };
    case 1:
      return {
        title,
        steps: [
          info('Sekstenere og enere',
            '<p>I titalssystemet har vi enere og tiere. I hex har vi <strong>enere</strong> og <strong>sekstenere</strong>, fordi hver plads er 16 gange mere værd end pladsen til højre.</p>' +
            '<p>Sådan læser du <code>2F</code>: 2 sekstenere og F (15) enere. 2 · 16 + 15 = 32 + 15 = <strong>47</strong>.</p>' +
            '<p>Prøv selv: skift cifrene op og ned og se værdien.</p>',
            { demo: 'hex2' }),
          ex(hexToDec(g, 0x11, 0x3f)),
          ex(hexToDec(g, 0x41, 0x9f)),
          ex(hexToDec(g, 0xa0, 0xfe)),
          info('Den anden vej',
            '<p>Vil du skrive et tal i hex, så find ud af, hvor mange gange <strong>16</strong> kan være i tallet. Det er det første ciffer. Resten er det andet ciffer.</p>' +
            '<p>Eksempel med <strong>200</strong>: 16 kan være 12 gange i 200 (12 · 16 = 192), og der er 8 tilbage. 12 er C, så 200 = <code>C8</code>.</p>' +
            '<p>Tip: 16-tabellen er 16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240.</p>'),
          ex(decToHex(g, 17, 95)),
          ex(decToHex(g, 100, 250)),
          ex(largestTwoDigits(g)),
        ],
      };
    case 2:
      return {
        title,
        steps: [
          info('Ét hex-ciffer er 4 bits',
            '<p>Med 4 bits kan du lave 16 mønstre, fra <code>0000</code> (0) til <code>1111</code> (15). Og hex har netop 16 cifre!</p>' +
            '<p>Derfor svarer <strong>ét hex-ciffer til præcis 4 bits</strong>. <code>1011</code> = 8 + 2 + 1 = 11 = <code>B</code>.</p>' +
            '<p>Prøv at tænde bitsene og se hex-cifferet.</p>',
            { demo: 'nibble' }),
          ex(hexDigitToBits(g)),
          ex(hexDigitToBits(g)),
          ex(bitsToHexDigit(g)),
          ex(bitsToHexDigit(g)),
          info('En byte er to hex-cifre',
            '<p>En <strong>byte</strong> er 8 bits. Del den i to grupper af 4, og skriv hver gruppe som ét hex-ciffer:</p>' +
            '<p><code>1010 0111</code> → <code>1010</code> = A og <code>0111</code> = 7 → <code>A7</code>.</p>' +
            '<p>En byte går derfor fra <code>00</code> til <code>FF</code>, altså fra 0 til 255. Det får du brug for, når vi kommer til farver.</p>'),
          ex(byteToHex(g)),
          ex(byteToHex(g)),
          ex(hexToByte(g)),
        ],
      };
    case 3:
      return {
        title,
        steps: [
          info('Tre små lys i hver prik',
            '<p>En skærm består af tusindvis af små prikker, som kaldes <strong>pixels</strong>. Hver pixel har tre bittesmå lys: ' +
            '<strong style="color:#e33">rød</strong>, <strong style="color:#2a2">grøn</strong> og <strong style="color:#36f">blå</strong>. ' +
            'Derfor kalder man det <strong>RGB</strong> (Red, Green, Blue).</p>' +
            '<p>Lysene sidder så tæt, at øjet blander dem til én farve.</p>'),
          info('Lys blandes anderledes end maling',
            '<p>Når du blander maling, bliver det mørkere. Når du blander <strong>lys</strong>, bliver det lysere. ' +
            'Rødt og grønt lys giver for eksempel <strong>gul</strong>, og alle tre lys sammen giver <strong>hvid</strong>.</p>' +
            '<p>Tænd og sluk lysene herunder og se, hvilke farver de laver.</p>',
            { demo: 'rgbOnOff' }),
          ex(mixLights(g)),
          ex(mixLights(g)),
          ex(whichLights(g)),
          info('Mere end tændt og slukket',
            '<p>Hvert lys kan skrues op og ned i <strong>256 trin</strong>, fra <strong>0</strong> (slukket) til <strong>255</strong> (fuld styrke). ' +
            'Det er præcis det, én byte kan rumme. Så hver farve er tre bytes: én til rød, én til grøn og én til blå.</p>' +
            '<p>Prøv skyderne. Læg mærke til, hvad der sker, når du skruer halvt op for rød og helt op for grøn.</p>',
            { demo: 'rgbSliders' }),
          ex(fullStrength(g)),
          ex(rgbName(g)),
        ],
      };
    case 4:
      return {
        title,
        steps: [
          info('Tre par hex-cifre',
            '<p>En farvekode på nettet ser sådan ud: <code>#FF8000</code>. Efter <code>#</code> kommer tre par hex-cifre:</p>' +
            '<p><code><span style="color:#e33">RR</span><span style="color:#2a2">GG</span><span style="color:#36f">BB</span></code> = rød, grøn og blå. ' +
            'Hvert par er én byte fra <code>00</code> (slukket) til <code>FF</code> (fuld styrke).</p>' +
            '<p><code>#FF8000</code>: rød <code>FF</code> fuld, grøn <code>80</code> halv, blå <code>00</code> slukket. Det giver orange.</p>',
            { swatches: [SW('#FF8000', '#FF8000 orange')] }),
          info('Prøv med skyderne',
            '<p>Skyderne viser nu farvekoden. Flyt én skyder ad gangen og se, hvilket par i koden der ændrer sig.</p>',
            { demo: 'rgbSliders' }),
          ex(whichPair(g)),
          ex(pairToDec(g)),
          info('Grundfarverne',
            '<p>Med kun <code>00</code> og <code>FF</code> kan du lave de otte grundfarver. Læg mærke til, hvilke par der er <code>FF</code>:</p>',
            {
              swatches: BASIC_COLORS.map((c) => SW(rgbToHex(c.rgb), `${rgbToHex(c.rgb)} ${c.name}`)),
            }),
          ex(codeToSwatch(g)),
          ex(codeToSwatch(g)),
          ex(swatchToCode(g)),
          ex(typeBasic(g)),
        ],
      };
    case 5:
      return {
        title,
        steps: [
          info('Lyse og mørke farver',
            '<p>Lave tal betyder lidt lys, og høje tal betyder meget lys. Skruer du ned for alle tre, bliver farven <strong>mørkere</strong>. Skruer du op, bliver den <strong>lysere</strong>.</p>' +
            '<p>Er rød, grøn og blå <strong>lige stærke</strong>, bliver farven <strong>grå</strong>, fra sort til hvid:</p>',
            {
              swatches: [SW('#000000', '#000000'), SW('#404040', '#404040'), SW('#808080', '#808080'), SW('#C0C0C0', '#C0C0C0'), SW('#FFFFFF', '#FFFFFF')],
            }),
          ex(findGray(g)),
          ex(darkest(g)),
          ex(lighter(g)),
          info('Blandede farver',
            '<p>De fleste farver er en blanding. Sådan læser du en kode:</p>' +
            '<p>1. Find det <strong>stærkeste</strong> lys. Det er hovedfarven.<br>' +
            '2. Se på det <strong>næststærkeste</strong>. Det trækker farven mod en blanding, fx rød + lidt grøn = orange.<br>' +
            '3. Det <strong>svageste</strong> lys gør farven lysere og blegere, jo højere det er.</p>',
            { swatches: MIXED_COLORS.map((m) => SW(m.code, `${m.code} ${m.name}`)) }),
          ex(strongest(g)),
          ex(mixedToSwatch(g)),
          ex(mixedToSwatch(g)),
        ],
      };
    default:
      return {
        title,
        steps: [
          info('Sådan rammer du en farve',
            '<p>Nu skal du lave en farve, du kan se, men ikke kender koden til. Sådan gør du:</p>' +
            '<p>1. <strong>Gæt groft.</strong> Hvilke lys er stærke? Brug kun <code>00</code>, <code>80</code> og <code>FF</code> i første gæt.<br>' +
            '2. <strong>Ret én farve ad gangen.</strong> Er rød for høj, så skru ned for rød og lad resten være.<br>' +
            '3. <strong>Lyst eller mørkt?</strong> Er dit gæt for mørkt, så skru op for alle tre.</p>' +
            '<p>Målfarverne bruger trinene <code>00</code>, <code>33</code>, <code>66</code>, <code>99</code>, <code>CC</code> og <code>FF</code>. Du har 3 forsøg pr. farve.</p>'),
          ex(matchColor(g, 'sliders', 0)),
          ex(matchColor(g, 'sliders', 0)),
          info('Nu med tastaturet',
            '<p>Nu skal du skrive koden selv, ligesom i Hex-jagt. Efter hvert gæt får du at vide, om hver farve er for høj eller for lav. ' +
            '<em>"Rød: lidt for høj"</em> betyder: skru lidt ned for <code>RR</code>.</p>' +
            '<p>Rammer du inden for ét trin (fx <code>99</code> i stedet for <code>AA</code>), tæller det som rigtigt.</p>'),
          ex(matchColor(g, 'text', 0x11)),
          ex(matchColor(g, 'text', 0x11)),
          ex(matchColor(g, 'text', 0x11)),
        ],
      };
  }
}

export function exerciseCount(lesson: Lesson): number {
  return lesson.steps.filter((s) => s.type === 'exercise').length;
}
