import type { Challenge } from './types';
import { challenge as pladsholder } from './pladsholder';
import { challenge as binaryDecimal } from './binary-decimal';

/** Alle udfordringer i spillet. Tilføj nye her. */
export const challenges: Challenge[] = [binaryDecimal, pladsholder];

export function findChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}
