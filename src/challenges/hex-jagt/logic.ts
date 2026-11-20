/** Ren logik for Hex-jagt (ingen DOM), så den kan testes. */

export type Base = 'dec' | 'bin' | 'hex';

export const BASE_NAVN: Record<Base, string> = {
  dec: 'decimal',
  bin: 'binær',
  hex: 'hexadecimal',
};

export const RADIX: Record<Base, number> = { dec: 10, bin: 2, hex: 16 };

export type Rng = () => number;

export function randInt(min: number, max: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Skriver et tal i den ønskede base, som spilleren ville skrive det. */
export function formatNumber(n: number, base: Base): string {
  if (base === 'hex') return n.toString(16).toUpperCase();
  if (base === 'bin') return n.toString(2).padStart(8, '0').replace(/(\d{4})(?=\d)/g, '$1 ');
  return String(n);
}

/**
 * Tolker spillerens svar. Tillader mellemrum, store/små bogstaver og
 * præfikser som 0x, # og 0b. Returnerer null hvis svaret ikke er gyldigt.
 */
export function parseAnswer(raw: string, base: Base): number | null {
  let s = raw.trim().toLowerCase().replace(/[\s_]/g, '');
  if (base === 'hex') s = s.replace(/^(0x|#)/, '');
  if (base === 'bin') s = s.replace(/^0b/, '');
  const valid = { dec: /^\d+$/, bin: /^[01]+$/, hex: /^[0-9a-f]+$/ }[base];
  if (!s || !valid.test(s)) return null;
  return parseInt(s, RADIX[base]);
}

export interface ConversionTask {
  value: number;
  from: Base;
  to: Base;
}

/** Sværhedsgrad stiger: først små tal, derefter hele byten. */
export function makeConversionTask(round: number, rng: Rng = Math.random): ConversionTask {
  const pairs: [Base, Base][] = [
    ['hex', 'dec'],
    ['dec', 'hex'],
    ['bin', 'hex'],
    ['hex', 'bin'],
    ['bin', 'dec'],
    ['dec', 'bin'],
  ];
  const [from, to] = pairs[round % pairs.length];
  const max = round < 2 ? 15 : round < 4 ? 63 : 255;
  return { value: randInt(round < 2 ? 1 : 16, max, rng), from, to };
}

/** En kort forklaring der vises når spilleren svarer forkert. */
export function explain(task: ConversionTask): string {
  const { value } = task;
  const hex = value.toString(16).toUpperCase().padStart(2, '0');
  const hi = value >> 4;
  const lo = value & 15;
  const nib = (n: number) => n.toString(2).padStart(4, '0');
  return (
    `${value} = ${hi} · 16 + ${lo} = 0x${hex}. ` +
    `Hvert hex-ciffer svarer til 4 bit: ${hex[0]} = ${nib(hi)}, ${hex[1]} = ${nib(lo)}.`
  );
}

// ---------- Farver ----------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((c) => c.toString(16).toUpperCase().padStart(2, '0')).join('');
}

/** Tolker #RRGGBB (også uden #, og kortformen #RGB). */
export function parseHexColor(raw: string): Rgb | null {
  let s = raw.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = s.replace(/./g, '$&$&');
  if (!/^[0-9a-f]{6}$/.test(s)) return null;
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/**
 * Målfarver. De første runder bruger kun 00, 33, 66, 99, CC, FF pr. kanal
 * (lettere at ramme), de senere runder bruger trin på 0x11.
 */
export function makeTargetColor(round: number, rng: Rng = Math.random): Rgb {
  const step = round < 2 ? 0x33 : 0x11;
  const pick = () => randInt(0, 255 / step, rng) * step;
  return { r: pick(), g: pick(), b: pick() };
}

/** Største afvigelse på én kanal (0–255). */
export function colorDistance(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
}

export const COLOR_MAX_POINTS = 25;

export function colorPoints(distance: number): number {
  if (distance === 0) return COLOR_MAX_POINTS;
  if (distance <= 0x11) return 20;
  if (distance <= 0x22) return 12;
  if (distance <= 0x44) return 5;
  return 0;
}

/** Feedback pr. kanal, fx "Rød: lidt for høj". */
export function channelHints(guess: Rgb, target: Rgb): string[] {
  const navne: [keyof Rgb, string][] = [
    ['r', 'Rød (RR)'],
    ['g', 'Grøn (GG)'],
    ['b', 'Blå (BB)'],
  ];
  return navne.map(([k, navn]) => {
    const d = guess[k] - target[k];
    if (d === 0) return `${navn}: præcis ✓`;
    const grad = Math.abs(d) <= 0x11 ? 'en smule' : Math.abs(d) <= 0x44 ? 'lidt' : 'meget';
    return `${navn}: ${grad} for ${d > 0 ? 'høj' : 'lav'}`;
  });
}
