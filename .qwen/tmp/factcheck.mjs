// Fact-inventory checker for the PENDING.md dedupe.
// A "fact token" = every distinct number or hex colour in the file.
// Invariant for a MERGE (not a rewrite): every distinct token present BEFORE
// must still be present AFTER. Duplicates collapse; facts may not.
import fs from 'node:fs';

const tok = (s) => {
  const nums = new Set((s.match(/\d+(?:\.\d+)?/g) || []));
  const hexes = new Set((s.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map((h) => h.toLowerCase()));
  return { nums, hexes };
};

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.log('usage: node factcheck.mjs <before.md> <after.md>');
  process.exit(64);
}

const a = fs.readFileSync(fileA, 'utf8');
const b = fs.readFileSync(fileB, 'utf8');
const A = tok(a);
const B = tok(b);

const missingNums = [...A.nums].filter((n) => !B.nums.has(n));
const missingHexes = [...A.hexes].filter((h) => !B.hexes.has(h));

const headingCounts = {};
for (const line of b.split(/\r?\n/)) {
  const t = line.trim();
  if (/^#{1,3} /.test(t)) headingCounts[t] = (headingCounts[t] || 0) + 1;
}
const dupes = Object.entries(headingCounts).filter(([, n]) => n > 1);

console.log(`tokens  before: ${A.nums.size} numbers + ${A.hexes.size} colours`);
console.log(`tokens  after : ${B.nums.size} numbers + ${B.hexes.size} colours`);
console.log(`headings after: ${Object.keys(headingCounts).length} distinct, ${dupes.length} duplicated`);
if (missingNums.length) console.log('DROPPED NUMBERS: ' + missingNums.join(', '));
if (missingHexes.length) console.log('DROPPED COLOURS: ' + missingHexes.join(', '));
if (dupes.length) console.log('DUPLICATE HEADINGS: ' + dupes.map(([h, n]) => `${h} x${n}`).join(' | '));

// Statuses must be one of the allowed vocabulary after the merge.
const stale = [...new Set([...b.matchAll(/\b(in flight|running|held back to cap concurrency)\b/gi)].map((m) => m[0]))];
if (stale.length) console.log('STALE STATUS WORDS STILL PRESENT: ' + stale.join(', '));

const ok = !missingNums.length && !missingHexes.length && !dupes.length && !stale.length;
console.log(ok ? 'RESULT: PASS — no fact token dropped, no duplicate heading, no stale status' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
