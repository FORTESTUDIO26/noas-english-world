// Renders public/icon.svg to PNG app icons with headless Chrome.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public/icon.svg'), 'utf8');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
// maskable: the same art shrunk to the 80% safe zone on the brand background
const mask = (size) => `<div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#9b5de5,#ff5fa8);display:flex;align-items:center;justify-content:center">${svg.replace('<svg ', `<svg width="${Math.round(size * 0.8)}" height="${Math.round(size * 0.8)}" `)}</div>`;
for (const [size, name, maskable] of [[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png'], [512, 'maskable-512.png', true]]) {
  const html = path.join(tmp, `i${size}${maskable ? 'm' : ''}.html`);
  fs.writeFileSync(html, `<html><body style="margin:0;overflow:hidden">${maskable ? mask(size) : svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const out = path.join(root, 'public/icons', name);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--screenshot=${out}`, `--window-size=${size},${size}`, 'file:///' + html.split(path.sep).join('/')], { stdio: 'ignore' });
  console.log(name, fs.statSync(out).size);
}
