import type { ChallengeResult } from '../challenges/types';

/** Andel af maxScore der kræves for at låse næste niveau op. */
export const UNLOCK_THRESHOLD = 0.8;

const STORAGE_KEY = 'digitale-udfordringer:fremskridt:v1';

export interface LevelRecord {
  bestScore: number;
  maxScore: number;
  completed: boolean;
}

export interface ChallengeProgress {
  /** Højeste niveau spilleren har adgang til (1-baseret). */
  unlockedLevel: number;
  levels: Record<number, LevelRecord>;
  data: Record<string, unknown>;
}

export interface ProgressState {
  totalPoints: number;
  challenges: Record<string, ChallengeProgress>;
}

/** Minimal udgave af Storage, så tests kan bruge en falsk lagring. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function emptyState(): ProgressState {
  return { totalPoints: 0, challenges: {} };
}

function emptyChallenge(): ChallengeProgress {
  return { unlockedLevel: 1, levels: {}, data: {} };
}

/** Fremskridt for hele spillet, gemt i localStorage. */
export class ProgressStore {
  private state: ProgressState;
  private listeners = new Set<() => void>();

  constructor(private readonly store: KeyValueStore | null = safeLocalStorage()) {
    this.state = this.load();
  }

  private load(): ProgressState {
    try {
      const raw = this.store?.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      return {
        totalPoints: typeof parsed.totalPoints === 'number' ? parsed.totalPoints : 0,
        challenges: parsed.challenges && typeof parsed.challenges === 'object' ? parsed.challenges : {},
      };
    } catch {
      return emptyState();
    }
  }

  private save(): void {
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Lagring kan være blokeret (privat vindue o.l.). Spillet kører videre i hukommelsen.
    }
    this.listeners.forEach((fn) => fn());
  }

  private challenge(id: string): ChallengeProgress {
    return (this.state.challenges[id] ??= emptyChallenge());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get totalPoints(): number {
    return this.state.totalPoints;
  }

  /** Spillerens niveau i hele spillet, beregnet ud fra samlede point. */
  get playerLevel(): number {
    return playerLevelFor(this.state.totalPoints);
  }

  addPoints(n: number): void {
    if (!Number.isFinite(n) || n <= 0) return;
    this.state.totalPoints += Math.round(n);
    this.save();
  }

  unlockedLevel(id: string): number {
    return this.state.challenges[id]?.unlockedLevel ?? 1;
  }

  levelRecord(id: string, level: number): LevelRecord | undefined {
    return this.state.challenges[id]?.levels[level];
  }

  bestScore(id: string): number {
    const levels = this.state.challenges[id]?.levels ?? {};
    return Object.values(levels).reduce((best, r) => Math.max(best, r.bestScore), 0);
  }

  completedLevels(id: string): number {
    const levels = this.state.challenges[id]?.levels ?? {};
    return Object.values(levels).filter((r) => r.completed).length;
  }

  /**
   * Registrér en afsluttet runde. Returnerer true, hvis et nyt niveau blev låst op.
   */
  recordResult(id: string, level: number, result: ChallengeResult, maxLevel: number): boolean {
    const c = this.challenge(id);
    const passed = result.maxScore > 0 && result.score / result.maxScore >= UNLOCK_THRESHOLD;
    const prev = c.levels[level];
    c.levels[level] = {
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
      maxScore: result.maxScore,
      completed: (prev?.completed ?? false) || passed,
    };
    let unlocked = false;
    if (passed && level >= c.unlockedLevel && level < maxLevel) {
      c.unlockedLevel = level + 1;
      unlocked = true;
    }
    this.save();
    return unlocked;
  }

  getData<T>(id: string, key: string, fallback: T): T {
    const data = this.state.challenges[id]?.data;
    return data && key in data ? (data[key] as T) : fallback;
  }

  setData<T>(id: string, key: string, value: T): void {
    this.challenge(id).data[key] = value;
    this.save();
  }

  reset(): void {
    this.state = emptyState();
    try {
      this.store?.removeItem(STORAGE_KEY);
    } catch {
      /* ignorer */
    }
    this.listeners.forEach((fn) => fn());
  }
}

/** Point der kræves for at nå et givet spillerniveau: 0, 100, 300, 600, 1000 ... */
export function pointsForPlayerLevel(level: number): number {
  return (50 * (level - 1) * level);
}

export function playerLevelFor(points: number): number {
  let level = 1;
  while (points >= pointsForPlayerLevel(level + 1)) level++;
  return level;
}

function safeLocalStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
