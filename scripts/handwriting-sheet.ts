// Renders a review sheet of all handwriting paths (A–P, capital + small):
// writing lines, dashed path, numbered green start points, direction arrows.
//   node scripts/handwriting-sheet.ts            -> scripts/.review/handwriting.html (+ .png with Chrome)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { UPPER, LOWER, LINES, samplePath, pointAt, pathLength, isDot, arrowSpots, type Pt } from '../src/content/handwriting.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'scripts', '.review');
fs.mkdirSync(OUT, { recursive: true });

function letterSvg(strokes: string[], label: string) {
  const t = strokes.map((d) => samplePath(d, 1.2));
  const desc = t.some((s) => s.some((p) => p.y > LINES.base + 4));
  const h = desc ? 120 : 92;
  const markers: Pt[] = [];
  t.forEach((s) => {
    const p = s[0];
    const clash = markers.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 8);
    markers.push(clash && !isDot(s) ? pointAt(s, Math.min(0.35, 10 / Math.max(10, pathLength(s)))).p : p);
  });
  const lines = [LINES.top, LINES.mid, LINES.base, ...(desc ? [LINES.desc] : [])]
    .map((y, i) => `<line x1="4" x2="96" y1="${y}" y2="${y}" stroke="${i === 2 ? '#7b4fc2' : '#cdb9ea'}" stroke-width="${i === 2 ? 1 : 0.7}" ${i === 1 || i === 3 ? 'stroke-dasharray="2.2 2.2"' : ''}/>`).join('');
  const paths = strokes.map((d, k) => (isDot(t[k])
    ? `<circle cx="${t[k][0].x}" cy="${t[k][0].y}" r="3.2" fill="#e2d4f7"/>`
    : `<path d="${d}" fill="none" stroke="#e2d4f7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#9b6fdc" stroke-width="1.3" stroke-dasharray="2.4 2.4"/>`)).join('');
  const arrows = t.map((s) => arrowSpots(s).map(({ p, angle }) => {
    return `<path d="M-3.2 -2.6 L3 0 L-3.2 2.6 Z" fill="#ff8a1f" transform="translate(${p.x} ${p.y}) rotate(${angle})"/>`;
  }).join('')).join('');
  const starts = markers.map((p, k) => `<g transform="translate(${p.x} ${p.y})"><circle r="4.6" fill="#22a95b" stroke="#fff" stroke-width="1.2"/><text y="1.9" text-anchor="middle" fill="#fff" font-size="5.4" font-weight="800" font-family="Arial">${k + 1}</text></g>`).join('');
  return `<figure><svg viewBox="0 0 100 ${h}" width="150" height="${h * 1.5}">${lines}${paths}${arrows}${starts}</svg><figcaption>${label}</figcaption></figure>`;
}

const ids = Object.keys(UPPER) as (keyof typeof UPPER)[];
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:12px;font-family:Arial;background:#fff}figure{display:inline-block;margin:6px;text-align:center;border:1px solid #eee;border-radius:10px;vertical-align:top}figcaption{font:700 18px Arial}</style>
${ids.map((id) => letterSvg(UPPER[id], id.toUpperCase()) + letterSvg(LOWER[id], id)).join('')}`;
const file = path.join(OUT, 'handwriting.html');
fs.writeFileSync(file, html);
const png = path.join(OUT, 'handwriting.png');
execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--screenshot=${png}`, '--window-size=1340,1560', 'file:///' + file.split(path.sep).join('/')], { stdio: 'ignore' });
console.log(png);
