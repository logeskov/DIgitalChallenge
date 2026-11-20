/**
 * Fælles hjælper til tilfældige opgaver uden gentagelser inden for en runde.
 *
 * Opret én pr. runde (fx i mount eller når en ny runde starter) og træk alle
 * rundens tal eller opgaver gennem den. Er alle muligheder i et interval brugt,
 * tillades gentagelser igen, men aldrig det samme som sidst.
 */
export type Rng = () => number;

export interface UniqueRandom {
  /** Heltal i [min, max], som ikke er trukket før i denne runde. */
  int(min: number, max: number): number;
  /**
   * Kalder `make`, indtil den giver noget med en nøgle, der ikke er set før i runden.
   * Brug til sammensatte opgaver som farver: `pick(() => lavFarve(), rgbToHex)`.
   */
  pick<T>(make: () => T, key: (value: T) => string | number): T;
  /** Har denne værdi/nøgle allerede været brugt i runden? */
  has(key: string | number): boolean;
  /** Start en ny runde. */
  reset(): void;
}

const MAX_TRIES = 200;

export function createUniqueRandom(rng: Rng = Math.random): UniqueRandom {
  const seen = new Set<string | number>();
  let last: string | number | undefined;

  const remember = (k: string | number) => {
    seen.add(k);
    last = k;
  };

  const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  return {
    int(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      if (max < min) throw new RangeError(`Tomt interval [${min}, ${max}]`);
      for (let i = 0; i < MAX_TRIES; i++) {
        const v = randInt(min, max);
        if (!seen.has(v)) return remember(v), v;
      }
      // Små intervaller med de fleste tal brugt: find et ledigt tal ud fra et tilfældigt startpunkt.
      const size = max - min + 1;
      const start = randInt(0, size - 1);
      for (let i = 0; i < size; i++) {
        const v = min + ((start + i) % size);
        if (!seen.has(v)) return remember(v), v;
      }
      // Alt er brugt: tillad gentagelse, men ikke samme tal to gange i træk.
      let v = randInt(min, max);
      if (size > 1 && v === last) v = v === max ? min : v + 1;
      return remember(v), v;
    },
    pick(make, key) {
      let value = make();
      for (let i = 0; i < MAX_TRIES && (seen.has(key(value)) || key(value) === last); i++) {
        value = make();
      }
      remember(key(value));
      return value;
    },
    has: (k) => seen.has(k),
    reset() {
      seen.clear();
      last = undefined;
    },
  };
}
