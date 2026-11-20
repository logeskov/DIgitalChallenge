/** Fælles kontrakt mellem spillets ramme og hver udfordring. */
export interface ChallengeResult {
  score: number;
  maxScore: number;
}

export interface ChallengeStorage {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
}

export interface ChallengeContext {
  /** Aktuelt niveau, 1-baseret. */
  level: number;
  addPoints(n: number): void;
  /** Gemmer bedste resultat og låser næste niveau op ved >= 80 %. */
  finish(result: ChallengeResult): void;
  exit(): void;
  getBest(): number;
  storage: ChallengeStorage;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category?: string;
  /** Antal niveauer, standard 1. */
  levels?: number;
  /** Tegner udfordringen i `el`. Returnerer en oprydningsfunktion. */
  mount(el: HTMLElement, ctx: ChallengeContext): () => void;
}
