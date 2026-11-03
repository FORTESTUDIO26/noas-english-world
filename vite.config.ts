import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Writes dist/sw.js after the build with the complete list of files
 * (JS, CSS, icons and every audio clip). The cache name is a hash of the
 * file list + contents, so any change to the app or a sound updates it.
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'noa-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of fs.readdirSync(dir)) {
          const p = path.join(dir, f);
          if (fs.statSync(p).isDirectory()) walk(p);
          else files.push(path.relative(outDir, p).split(path.sep).join('/'));
        }
      };
      walk(outDir);
      const list = files.filter((f) => f !== 'sw.js').sort();
      const tpl = fs.readFileSync(path.resolve('src/sw-template.js'), 'utf8');
      const hash = crypto.createHash('sha1').update(tpl);
      for (const f of list) hash.update(f).update(fs.readFileSync(path.join(outDir, f)));
      const version = hash.digest('hex').slice(0, 10);
      fs.writeFileSync(path.join(outDir, 'sw.js'), tpl.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(['./', ...list.map((f) => `./${f}`)])));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  server: { port: 5290, strictPort: true },
  preview: { port: 5291, strictPort: true },
});
