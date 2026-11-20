import type { Challenge } from './types';
import { challenge as binaerIntro } from './binaer-intro';
import { challenge as pladsholder } from './pladsholder';
import { challenge as binaryDecimal } from './binary-decimal';
import { challenge as hexJagt } from './hex-jagt';

/** Alle udfordringer i spillet. Tilføj nye her. */
export const challenges: Challenge[] = [binaerIntro, pladsholder, binaryDecimal, hexJagt];

export function findChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}
