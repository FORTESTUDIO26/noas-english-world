// Handwriting model for A–P (capital and small letters).
// Each letter is a list of strokes, in the order they are written, each stroke
// drawn in its writing direction (ball-and-stick manuscript, the common style
// taught in elementary school; small "a" is the one-storey handwritten a).
// The shapes are NOT taken from a font.
//
// Coordinates: viewBox 0 0 100 120 with four writing lines
//   TOP 20 (capitals, tall letters) · MID 50 (x-height) · BASE 80 · DESC 108
// Paths use only M, L and C (absolute) so they can be sampled without a browser.

import type { LetterId } from './letters.ts';

export const LINES = { top: 20, mid: 50, base: 80, desc: 108 } as const;

export type Strokes = string[];

export const UPPER: Record<LetterId, Strokes> = {
  a: ['M50 20 L26 80', 'M50 20 L74 80', 'M35 58 L65 58'],
  b: ['M30 20 L30 80', 'M30 20 L50 20 C68 20 68 50 50 50 L30 50 L53 50 C72 50 72 80 53 80 L30 80'],
  c: ['M72 32 C66 22 58 20 50 20 C34 20 26 34 26 50 C26 66 34 80 50 80 C58 80 66 78 72 68'],
  d: ['M30 20 L30 80', 'M30 20 L46 20 C66 20 74 34 74 50 C74 66 66 80 46 80 L30 80'],
  e: ['M30 20 L30 80', 'M30 20 L70 20', 'M30 50 L62 50', 'M30 80 L70 80'],
  f: ['M30 20 L30 80', 'M30 20 L70 20', 'M30 50 L62 50'],
  g: ['M72 32 C66 22 58 20 50 20 C34 20 26 34 26 50 C26 66 34 80 50 80 C62 80 72 72 72 60 L72 54 L56 54'],
  h: ['M30 20 L30 80', 'M70 20 L70 80', 'M30 50 L70 50'],
  i: ['M50 20 L50 80', 'M36 20 L64 20', 'M36 80 L64 80'],
  j: ['M64 20 L64 64 C64 76 58 80 50 80 C42 80 36 76 34 68'],
  k: ['M32 20 L32 80', 'M70 20 L33 54 L70 80'],
  l: ['M32 20 L32 80 L68 80'],
  m: ['M26 20 L26 80', 'M26 20 L50 62 L74 20 L74 80'],
  n: ['M30 20 L30 80', 'M30 20 L70 80 L70 20'],
  o: ['M50 20 C34 20 26 34 26 50 C26 66 34 80 50 80 C66 80 74 66 74 50 C74 34 66 20 50 20'],
  p: ['M30 20 L30 80', 'M30 20 L50 20 C68 20 68 52 50 52 L30 52'],
};

// circle-back shape shared by a, c, d, g: starts at the right, goes up and back (counter-clockwise)
const BACK = 'M64 56 C60 51 55 50 50 50 C40 50 35 58 35 65 C35 73 41 80 49 80 C57 80 63 74 64 66';
// circle-forward shape shared by b, p: from the stem, up and forward (clockwise)
const FORWARD = 'C36 56 42 50 50 50 C59 50 65 57 65 65 C65 74 59 80 50 80 C42 80 36 75 34 70';

export const LOWER: Record<LetterId, Strokes> = {
  a: [`${BACK} L64 50 L64 80`], // one-storey a: circle back, push up, pull down
  b: [`M34 20 L34 80 L34 66 ${FORWARD}`],
  c: ['M64 56 C60 51 55 50 50 50 C40 50 35 58 35 65 C35 73 41 80 50 80 C56 80 61 77 64 73'],
  d: [`${BACK} L64 20 L64 80`],
  e: ['M36 65 L64 65 C64 56 58 50 50 50 C41 50 35 57 35 65 C35 74 41 80 50 80 C56 80 61 77 64 73'],
  f: ['M62 26 C59 21 55 20 52 20 C46 20 44 25 44 32 L44 80', 'M34 50 L58 50'],
  g: [`${BACK} L64 50 L64 98 C64 106 57 110 50 110 C43 110 38 106 36 102`],
  h: ['M34 20 L34 80 L34 64 C36 55 42 50 50 50 C58 50 64 55 64 63 L64 80'],
  i: ['M50 50 L50 80', 'M50 38 L50 38.6'],
  j: ['M54 50 L54 98 C54 106 49 110 43 110 C38 110 35 107 33 104', 'M54 38 L54 38.6'],
  k: ['M34 20 L34 80', 'M62 50 L35 68 L64 80'],
  l: ['M50 20 L50 80'],
  m: ['M26 50 L26 80 L26 62 C28 54 32 50 38 50 C44 50 48 54 48 62 L48 80 L48 62 C50 54 54 50 60 50 C66 50 70 54 70 62 L70 80'],
  n: ['M34 50 L34 80 L34 63 C36 55 42 50 50 50 C58 50 64 55 64 63 L64 80'],
  o: ['M50 50 C40 50 35 58 35 65 C35 73 41 80 50 80 C59 80 65 73 65 65 C65 58 60 50 50 50'],
  p: [`M34 50 L34 108 L34 66 ${FORWARD}`],
};

export function strokesOf(id: LetterId, which: 'upper' | 'lower'): Strokes {
  return (which === 'upper' ? UPPER : LOWER)[id];
}

// ---------------------------------------------------------------- geometry (no DOM needed)

export interface Pt { x: number; y: number }

/** Sample an M/L/C path into points about `step` units apart, in drawing order. */
export function samplePath(d: string, step = 1.5): Pt[] {
  const tok = d.match(/[MLC]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cur: Pt = { x: 0, y: 0 };
  let cmd = 'M';
  const num = () => parseFloat(tok[i++]);
  const push = (p: Pt) => {
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) pts.push(p);
  };
  while (i < tok.length) {
    if (/[MLC]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') {
      cur = { x: num(), y: num() };
      push(cur);
    } else if (cmd === 'L') {
      const to = { x: num(), y: num() };
      const n = Math.max(1, Math.ceil(Math.hypot(to.x - cur.x, to.y - cur.y) / step));
      for (let k = 1; k <= n; k++) push({ x: cur.x + ((to.x - cur.x) * k) / n, y: cur.y + ((to.y - cur.y) * k) / n });
      cur = to;
    } else {
      const c1 = { x: num(), y: num() };
      const c2 = { x: num(), y: num() };
      const to = { x: num(), y: num() };
      const approx = Math.hypot(c1.x - cur.x, c1.y - cur.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(to.x - c2.x, to.y - c2.y);
      const n = Math.max(2, Math.ceil(approx / step));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        push({
          x: u * u * u * cur.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
          y: u * u * u * cur.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
        });
      }
      cur = to;
    }
  }
  return pts;
}

export const pathLength = (pts: Pt[]) => pts.reduce((s, p, k) => (k ? s + Math.hypot(p.x - pts[k - 1].x, p.y - pts[k - 1].y) : 0), 0);
export const isDot = (pts: Pt[]) => pathLength(pts) < 2;

/** Point and direction at a fraction of a sampled stroke (for arrows and the animated pen). */
export function pointAt(pts: Pt[], frac: number): { p: Pt; angle: number } {
  const k = Math.min(pts.length - 1, Math.max(0, Math.round(frac * (pts.length - 1))));
  const a = pts[Math.max(0, k - 2)];
  const b = pts[Math.min(pts.length - 1, k + 2)];
  return { p: pts[k], angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

/**
 * Where to draw direction arrows on a stroke: never on a part that is drawn
 * twice (e.g. the stem of b: down, then back up), so an arrow can't show the
 * opposite direction of the first movement. Long strokes get two arrows.
 */
export function arrowSpots(pts: Pt[]): { p: Pt; angle: number }[] {
  if (isDot(pts)) return [];
  const n = pts.length;
  const retraced = (k: number) => pts.some((q, j) => Math.abs(j - k) > 8 && Math.hypot(q.x - pts[k].x, q.y - pts[k].y) < 3);
  const want = pathLength(pts) > 70 ? 2 : 1;
  const fracs = want === 2 ? [0.3, 0.75, 0.2, 0.85, 0.45, 0.6] : [0.5, 0.35, 0.65, 0.2, 0.8];
  const chosen: number[] = [];
  for (const f of fracs) {
    const k = Math.round(f * (n - 1));
    if (retraced(k) || chosen.some((c) => Math.abs(c - k) < n * 0.25)) continue;
    chosen.push(k);
    if (chosen.length === want) break;
  }
  return chosen.sort((a, b) => a - b).map((k) => pointAt(pts, k / (n - 1)));
}

// ---------------------------------------------------------------- checking a child's writing

export type WriteProblem = 'start' | 'direction' | 'missing' | 'outside' | 'lift' | 'empty';
export interface WriteResult { ok: boolean; problems: WriteProblem[]; strokeOk: boolean[] }

const D = 8; // allowed distance from the path (viewBox units; the letter is ~60 units tall)

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * How far along the target stroke the user's stroke got, walking forwards
 * only: reversed strokes, wrong starts and skipped parts don't count.
 */
function progress(target: Pt[], user: Pt[]): { started: boolean; reached: number } {
  if (isDot(target)) {
    const hit = user.some((p) => dist(p, target[0]) <= D + 4);
    return { started: hit, reached: hit ? 1 : 0 };
  }
  const head = Math.max(2, Math.floor(target.length * 0.2));
  let j = -1;
  let best = Infinity;
  for (let k = 0; k < head; k++) {
    const dd = dist(target[k], user[0]);
    if (dd < best) { best = dd; j = k; }
  }
  if (best > D * 1.8) return { started: false, reached: 0 };
  const W = 14; // look-ahead window (~20 units): allows uneven speed, not jumps
  for (const p of user) {
    for (let k = Math.min(target.length - 1, j + W); k > j; k--) {
      if (dist(target[k], p) <= D) { j = k; break; }
    }
  }
  return { started: true, reached: j / (target.length - 1) };
}

/** Check a written letter against its strokes. Pure – used by the UI and by tests. */
export function checkWriting(targetStrokes: Pt[][], userStrokes: Pt[][]): WriteResult {
  const user = userStrokes.filter((s) => s.length > 0);
  if (!user.length || user.flat().length < 3) return { ok: false, problems: ['empty'], strokeOk: targetStrokes.map(() => false) };
  const problems = new Set<WriteProblem>();
  // every drawn point must be near the letter
  const all = targetStrokes.flat();
  const pts = user.flat();
  const inside = pts.filter((p) => all.some((t) => dist(t, p) <= D)).length / pts.length;
  if (inside < 0.8) problems.add('outside');
  // strokes in order, each one its own finger movement
  const strokeOk: boolean[] = [];
  let u = 0;
  for (const t of targetStrokes) {
    // skip tiny accidental touches that are not a dot target
    while (u < user.length && user[u].length < 3 && !isDot(t)) u++;
    if (u >= user.length) { strokeOk.push(false); problems.add(user.length < targetStrokes.length ? 'lift' : 'missing'); continue; }
    const r = progress(t, user[u]);
    if (!r.started) {
      // maybe drawn backwards?
      const rev = progress(t, [...user[u]].reverse());
      problems.add(rev.started && rev.reached > 0.6 ? 'direction' : 'start');
      strokeOk.push(false);
    } else if (r.reached < 0.85) {
      const rev = progress(t, [...user[u]].reverse());
      problems.add(rev.reached > r.reached + 0.3 ? 'direction' : 'missing');
      strokeOk.push(false);
    } else strokeOk.push(true);
    u++;
  }
  const ok = problems.size === 0 && strokeOk.every(Boolean);
  return { ok, problems: [...problems], strokeOk };
}
