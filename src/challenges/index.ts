import type { Challenge } from './types';
import { challenge as pladsholder } from './pladsholder';

/** Alle udfordringer i spillet. Tilføj nye her. */
export const challenges: Challenge[] = [pladsholder];

export function findChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}
