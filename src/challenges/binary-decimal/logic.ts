export type Direction = 'bin-to-dec' | 'dec-to-bin';

export interface Level {
  bits: 4 | 8 | 16;
  name: string;
  /** Sekunder pr. opgave. */
  seconds: number;
  /** Svar på decimal→binær gives ved at klikke på bits (ellers indtastes de). */
  clickableBits: boolean;
  /** Vis pladsværdier (8 4 2 1 …) over bits. */
  showPlaceValues: boolean;
  /** Vis løbende sum af tændte bits. */
  showRunningSum: boolean;
}

export const LEVELS: Level[] = [
  { bits: 4, name: 'Niveau 1 · 4 bit', seconds: 20, clickableBits: true, showPlaceValues: true, showRunningSum: true },
  { bits: 8, name: 'Niveau 2 · 8 bit', seconds: 30, clickableBits: true, showPlaceValues: true, showRunningSum: false },
  { bits: 16, name: 'Niveau 3 · 16 bit', seconds: 45, clickableBits: false, showPlaceValues: false, showRunningSum: false },
];

export const TASKS_PER_ROUND = 8;
/** Rammen låser næste niveau op ved mindst 80 % rigtige, dvs. 7 af 8. */
export const PASS_THRESHOLD = Math.ceil(TASKS_PER_ROUND * 0.8);

export interface Task {
  direction: Direction;
  value: number;
  bits: number;
}

/** Tilfældigt tal der bruger hele bitbredden nogenlunde jævnt (undgår mest småtal). */
export function randomValue(bits: number, rnd: () => number = Math.random): number {
  const max = 2 ** bits - 1;
  // Mindst 1, og for større bredder lidt over halvdelen af bits i spil.
  const min = bits <= 4 ? 1 : 2 ** (Math.floor(bits / 2));
  return min + Math.floor(rnd() * (max - min + 1));
}

export function makeTask(bits: number, rnd: () => number = Math.random): Task {
  return {
    direction: rnd() < 0.5 ? 'bin-to-dec' : 'dec-to-bin',
    value: randomValue(bits, rnd),
    bits,
  };
}

export function makeRound(bits: number, rnd: () => number = Math.random): Task[] {
  const tasks: Task[] = [];
  const seen = new Set<number>();
  while (tasks.length < TASKS_PER_ROUND) {
    const t = makeTask(bits, rnd);
    if (seen.has(t.value) && seen.size < 2 ** bits - 2) continue;
    seen.add(t.value);
    tasks.push(t);
  }
  // Sørg for at begge retninger er med.
  if (tasks.every((t) => t.direction === tasks[0].direction)) {
    tasks[tasks.length - 1].direction = tasks[0].direction === 'bin-to-dec' ? 'dec-to-bin' : 'bin-to-dec';
  }
  return tasks;
}

export function toBinary(value: number, bits: number): string {
  return value.toString(2).padStart(bits, '0');
}

/** Grupperer en binær streng i nibbles: "10100011" → "1010 0011". */
export function groupNibbles(bin: string): string {
  return bin.replace(/(.{4})(?=.)/g, '$1 ');
}

export function bitsToValue(bits: boolean[]): number {
  // bits[0] er den mest betydende bit.
  return bits.reduce((acc, on) => acc * 2 + (on ? 1 : 0), 0);
}

/** Fortolker et decimalt svar. Returnerer null ved ugyldigt input. */
export function parseDecimal(input: string): number | null {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

/** Fortolker et binært svar (mellemrum tilladt). Returnerer null ved ugyldigt input. */
export function parseBinary(input: string): number | null {
  const s = input.replace(/[\s_]/g, '');
  if (!/^[01]+$/.test(s)) return null;
  return parseInt(s, 2);
}

/** Point for et rigtigt svar: 100 for svaret + bonus for resterende tid, ganget med niveau. */
export function scoreFor(levelIndex: number, secondsLeft: number, secondsTotal: number): number {
  const timeBonus = Math.round(100 * Math.max(0, Math.min(1, secondsLeft / secondsTotal)));
  return (100 + timeBonus) * (levelIndex + 1);
}
