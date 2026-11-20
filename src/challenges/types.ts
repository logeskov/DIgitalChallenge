/** Resultatet af en gennemført runde. */
export interface ChallengeResult {
  /** Opnået score i runden. */
  score: number;
  /** Højest mulige score i runden. */
  maxScore: number;
}

/** Simpel nøgle/værdi-lagring, afgrænset til den enkelte udfordring. */
export interface ChallengeStorage {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
}

/** Det, rammen giver en udfordring, når den startes. */
export interface ChallengeContext {
  /** Valgt niveau, 1-baseret. */
  level: number;
  /** Giv point undervejs (lægges til spillerens samlede point med det samme). */
  addPoints(n: number): void;
  /**
   * Afslut runden. Rammen gemmer bedste resultat for niveauet og låser
   * næste niveau op, hvis score >= 80 % af maxScore.
   */
  finish(result: ChallengeResult): void;
  /** Gå tilbage til menuen uden at afslutte. */
  exit(): void;
  /** Bedste score (af alle niveauer) for denne udfordring. */
  getBest(): number;
  /** Lagring afgrænset til denne udfordring (localStorage). */
  storage: ChallengeStorage;
}

/** En udfordring i spilsamlingen. */
export interface Challenge {
  /** Unik, url-venlig id, fx "binaer-decimal". */
  id: string;
  title: string;
  description: string;
  /** Emne, fx "Talsystemer". Bruges til at gruppere menuen. */
  category?: string;
  /** Antal niveauer (standard 1). */
  levels?: number;
  /** Tegn udfordringen i el. Returnerer en oprydningsfunktion. */
  mount(el: HTMLElement, ctx: ChallengeContext): () => void;
}
