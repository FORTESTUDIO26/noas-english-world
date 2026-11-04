// Teaches how a letter is written by hand: four writing lines, green numbered
// start points, direction arrows, an animated demonstration ("הראו לי איך
// כותבים") and finger practice that is checked stroke by stroke – start point,
// direction, order, lifts and staying on the path. A letter is never praised
// just because the finger moved (see checkWriting in content/handwriting.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LetterId } from '../content/letters.ts';
import { LINES, arrowSpots, checkWriting, isDot, pathLength, pointAt, samplePath, strokesOf, type Pt, type WriteResult } from '../content/handwriting.ts';
import { T } from '../text/he.ts';
import { IconCheck, IconEraser } from './icons.tsx';

const VB_W = 100;
const VB_H = 120;

export function HandwritingPad({ letter, which, hints = true, demo = true, onResult, disabled }: {
  letter: LetterId;
  which: 'upper' | 'lower';
  /** start dots, numbers and arrows (off in the exam) */
  hints?: boolean;
  /** offer the animated demonstration */
  demo?: boolean;
  onResult: (r: WriteResult) => void;
  disabled?: boolean;
}) {
  const strokes = strokesOf(letter, which);
  const targets = useMemo(() => strokes.map((d) => samplePath(d, 1.2)), [strokes]);
  const descender = targets.some((s) => s.some((p) => p.y > LINES.base + 4));
  const vbH = descender ? VB_H : 92;
  // Where to draw each numbered start point: on the real start, unless an earlier
  // stroke starts at the same place – then a little way along its own stroke.
  const markers = useMemo(() => {
    const out: Pt[] = [];
    targets.forEach((t, k) => {
      const p = t[0];
      const clash = out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 8);
      out.push(clash && !isDot(t) ? pointAt(t, Math.min(0.35, 10 / Math.max(10, pathLength(t)))).p : p);
      void k;
    });
    return out;
  }, [targets]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [ink, setInk] = useState<Pt[][]>([]);
  const drawing = useRef(false);
  const [anim, setAnim] = useState<{ stroke: number; frac: number } | null>(null);
  const [demoCount, setDemoCount] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => () => clearTimeout(raf.current), []);
  useEffect(() => { setInk([]); setAnim(null); setDemoCount(0); }, [letter, which]);

  const runDemo = () => {
    clearTimeout(raf.current);
    setInk([]);
    const lens = targets.map((t) => Math.max(pathLength(t), 1));
    // ~45 units per second: slow enough to follow with the eyes
    const durs = lens.map((l, k) => (isDot(targets[k]) ? 350 : Math.max(700, (l / 45) * 1000)));
    const PAUSE = 650;
    const total = durs.reduce((s, d) => s + d + PAUSE, 0) + 500;
    const t0 = performance.now();
    const tick = (now: number) => {
      let t = now - t0;
      let k = 0;
      while (k < durs.length && t > durs[k] + PAUSE) { t -= durs[k] + PAUSE; k++; }
      if (k >= durs.length) {
        setAnim({ stroke: durs.length, frac: 1 });
        if (now - t0 < total) raf.current = window.setTimeout(() => tick(performance.now()), 33);
        else { setAnim(null); setDemoCount((c) => c + 1); }
        return;
      }
      setAnim({ stroke: k, frac: Math.min(1, t / durs[k]) });
      raf.current = window.setTimeout(() => tick(performance.now()), 33);
    };
    raf.current = window.setTimeout(() => tick(performance.now()), 33);
  };

  const toVB = (e: React.PointerEvent): Pt | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const animating = anim !== null;
  const showHints = hints && !animating;

  return (
    <div className="hw">
      <div className="hw__pad" dir="ltr">
        <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${vbH}`} className="hw__svg" role="img" aria-label={T.common.drawLetter(which === 'upper' ? letter.toUpperCase() : letter)}
          onPointerDown={(e) => {
            if (disabled || animating) return;
            (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            const p = toVB(e);
            if (!p) return;
            drawing.current = true;
            setInk((s) => [...s, [p]]);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const p = toVB(e);
            if (!p) return;
            setInk((s) => {
              const last = s[s.length - 1];
              const q = last[last.length - 1];
              if (Math.hypot(p.x - q.x, p.y - q.y) < 0.8) return s;
              return [...s.slice(0, -1), [...last, p]];
            });
          }}
          onPointerUp={() => { drawing.current = false; }}
          onPointerCancel={() => { drawing.current = false; }}>
          {/* writing lines, like an English notebook */}
          <line x1="4" x2="96" y1={LINES.top} y2={LINES.top} className="hw__line hw__line--top" />
          <line x1="4" x2="96" y1={LINES.mid} y2={LINES.mid} className="hw__line hw__line--mid" />
          <line x1="4" x2="96" y1={LINES.base} y2={LINES.base} className="hw__line hw__line--base" />
          {descender && <line x1="4" x2="96" y1={LINES.desc} y2={LINES.desc} className="hw__line hw__line--desc" />}

          {/* dashed model path */}
          {strokes.map((d, k) => isDot(targets[k])
            ? <circle key={k} cx={targets[k][0].x} cy={targets[k][0].y} r="3.2" className="hw__model-dot" />
            : <g key={k}><path d={d} className="hw__model" /><path d={d} className="hw__model-dash" /></g>)}

          {/* arrows + numbered start points */}
          {showHints && targets.map((t, k) => {
            return arrowSpots(t).map(({ p, angle }, j) => (
              <path key={`${k}-${j}`} d="M-3.2 -2.6 L3 0 L-3.2 2.6 Z" className="hw__arrow" transform={`translate(${p.x} ${p.y}) rotate(${angle})`} />
            ));
          })}

          {/* the demonstration: strokes drawn one after another with a moving pen */}
          {anim && targets.map((t, k) => {
            if (k > anim.stroke) return null;
            const n = k < anim.stroke ? t.length : Math.max(1, Math.round(anim.frac * (t.length - 1)) + 1);
            const pts = t.slice(0, n);
            return isDot(t)
              ? <circle key={k} cx={t[0].x} cy={t[0].y} r="3" className="hw__demo-dot" />
              : <polyline key={k} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="hw__demo" />;
          })}
          {anim && anim.stroke < targets.length && (() => {
            const t = targets[anim.stroke];
            const p = t[Math.max(0, Math.round(anim.frac * (t.length - 1)))];
            return <circle cx={p.x} cy={p.y} r="3.6" className="hw__pen" />;
          })()}

          {/* the child's writing */}
          {ink.map((s, k) => (s.length === 1
            ? <circle key={k} cx={s[0].x} cy={s[0].y} r="2.8" className="hw__ink-dot" />
            : <polyline key={k} points={s.map((p) => `${p.x},${p.y}`).join(' ')} className="hw__ink" />))}

          {/* start points on top of everything */}
          {(showHints || animating) && targets.map((_t, k) => {
            const nextUp = animating && anim!.stroke === k && anim!.frac === 0;
            return (
              <g key={`s${k}`} className={`hw__start ${nextUp ? 'is-next' : ''}`} transform={`translate(${markers[k].x} ${markers[k].y})`}>
                <circle r="4.6" />
                <text y="1.9" textAnchor="middle">{k + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {hints && strokes.length > 1 && <p className="hw__tip">{T.write.lift}</p>}

      <div className="hw__actions">
        {demo && (
          <button type="button" className="btn btn--soft" onClick={runDemo} disabled={animating}>
            ✍️ {demoCount ? T.write.demoAgain : T.write.demo}
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => setInk([])} disabled={disabled || animating || !ink.length}><IconEraser /> {T.common.erase}</button>
        <button type="button" className="btn btn--primary" disabled={disabled || animating || !ink.length}
          onClick={() => onResult(checkWriting(targets, ink))}><IconCheck /> {T.common.done}</button>
      </div>
    </div>
  );
}

/** Hebrew message for a writing result (first problem only, so it stays short). */
export function writeMessage(r: WriteResult): string {
  if (r.ok) return T.write.good;
  const p = r.problems[0];
  return T.write.problem[p];
}
