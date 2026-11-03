// Renders public/icon.svg to PNG app icons with headless Chrome.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public/icon.svg'), 'utf8');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
for (const [size, name] of [[512, 'icon-512.png'], [192, 'icon-192.png'], [180, 'apple-touch-icon.png']]) {
  const html = path.join(tmp, `i${size}.html`);
  fs.writeFileSync(html, `<html><body style="margin:0;overflow:hidden">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const out = path.join(root, 'public/icons', name);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--screenshot=${out}`, `--window-size=${size},${size}`, 'file:///' + html.split(path.sep).join('/')], { stdio: 'ignore' });
  console.log(name, fs.statSync(out).size);
}
