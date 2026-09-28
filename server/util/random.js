// Cryptographically secure randomness. Game content selection uses this so that
// outcomes cannot be predicted by players observing earlier rounds.
import { randomInt, randomBytes } from 'node:crypto';

export const rint = (maxExclusive) => (maxExclusive <= 1 ? 0 : randomInt(maxExclusive));
export const pick = (arr) => arr[rint(arr.length)];

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (arr, n) => shuffle(arr).slice(0, n);

export const chance = (p) => rint(1_000_000) < p * 1_000_000;

// Unambiguous alphabet (no 0/O, 1/I/L) for human-typed codes.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function roomCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[rint(CODE_ALPHABET.length)];
  return s;
}

export const randomId = (bytes = 12) => randomBytes(bytes).toString('base64url');
