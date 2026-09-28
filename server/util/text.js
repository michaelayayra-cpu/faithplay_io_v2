// Answer normalisation and fuzzy matching.

const ARTICLES = /^(the|a|an)\s+/;

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[''`´]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(ARTICLES, '');
}

export const squash = (s) => normalize(s).replace(/ /g, '');

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Returns 'exact' | 'close' | null for a guess against a list of accepted answers.
export function matchAnswer(guess, accepted) {
  const g = squash(guess);
  if (!g) return null;
  let close = false;
  for (const a of accepted) {
    const t = squash(a);
    if (!t) continue;
    if (g === t) return 'exact';
    // Small typos are accepted on longer answers.
    const d = levenshtein(g, t);
    if (t.length >= 7 && d === 1) return 'exact';
    if (d <= Math.max(1, Math.floor(t.length / 5))) close = true;
  }
  return close ? 'close' : null;
}

// Does `text` contain the answer (used to stop leaking answers in chat)?
export function containsAnswer(text, accepted) {
  const g = squash(text);
  return accepted.some((a) => {
    const t = squash(a);
    return t.length >= 3 && g.includes(t);
  });
}

// Build alias list for a person/title: "King David" → ["King David", "David"].
export function aliasesFor(name, extra = []) {
  const out = new Set([name, ...extra]);
  const stripped = name
    .replace(/^(king|queen|the|prophet|apostle)\s+/i, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim();
  out.add(stripped);
  const paren = name.match(/\((.*?)\)/);
  if (paren) out.add(paren[1]);
  const comma = name.split(',')[0].trim();
  out.add(comma);
  return [...out].filter(Boolean);
}
